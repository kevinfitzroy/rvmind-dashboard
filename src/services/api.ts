import axios from 'axios';
import io, { Socket } from 'socket.io-client';

const api = axios.create({
  baseURL: 'https://192.168.8.145:3000/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 数据类型定义
export interface ButtonConfig {
  id: string;
  name: string;
  description: string;
  relayIndex: number;
  room: string;
}

export interface DeviceConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  buttons: ButtonConfig[];
}

export interface RoomInfo {
  name: string;
  buttons: Array<{
    buttonId: string;
    deviceId: string;
    name: string;
  }>;
}

export interface DeviceStatus {
  deviceId: string;
  relayStates: number[];
  inputStates: number[];
  isOnline: boolean;
  timestamp: number;
}

export interface StateChangeEvent {
  deviceId: string;
  address: number;
  port: string;
  relayStates?: number[];
  inputStates?: number[];
  timestamp: number;
  changedRelayIndexes?: number[];
  changedInputIndexes?: number[];
}

// 配置缓存管理类 - 用于缓存静态配置数据
class ConfigCache {
  private roomsCache: { rooms: RoomInfo[] } | null = null;
  private devicesCache: DeviceConfig[] | null = null;
  private configLoadPromise: Promise<void> | null = null;

  constructor() {
    // 立即加载配置数据
    this.loadConfigs();
  }

  public async loadConfigs(): Promise<void> {
    if (this.configLoadPromise) {
      return this.configLoadPromise;
    }

    this.configLoadPromise = (async () => {
      try {
        console.log('Loading static configuration data...');
        const [roomsResponse, devicesResponse] = await Promise.all([
          api.get<{ rooms: RoomInfo[] }>('/relay/rooms'),
          api.get<DeviceConfig[]>('/relay/devices')
        ]);

        this.roomsCache = roomsResponse.data;
        this.devicesCache = devicesResponse.data;
        
        console.log('Configuration data loaded:', {
          rooms: this.roomsCache?.rooms?.length || 0,
          devices: this.devicesCache?.length || 0
        });
      } catch (error) {
        console.error('Failed to load configuration data:', error);
        throw error;
      }
    })();

    return this.configLoadPromise;
  }

  async getRooms(): Promise<{ rooms: RoomInfo[] }> {
    await this.loadConfigs();
    return this.roomsCache || { rooms: [] };
  }

  async getDevices(): Promise<DeviceConfig[]> {
    await this.loadConfigs();
    return this.devicesCache || [];
  }

  // 同步获取（如果已加载）
  getRoomsSync(): { rooms: RoomInfo[] } | null {
    return this.roomsCache;
  }

  getDevicesSync(): DeviceConfig[] | null {
    return this.devicesCache;
  }

  // 重新加载配置（仅在配置变更时调用）
  async reloadConfigs(): Promise<void> {
    this.configLoadPromise = null;
    this.roomsCache = null;
    this.devicesCache = null;
    await this.loadConfigs();
  }
}

// 设备状态缓存管理类 - 只管理动态状态数据
class DeviceStatusCache {
  private cache = new Map<string, {
    isOnline: boolean;
    relayStates: number[];
    lastUpdate: number;
    isUpdating: boolean;
  }>();
  
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers = new Set<() => void>();
  private readonly CACHE_TTL = 10000; // 减少到10秒缓存有效期
  private readonly UPDATE_INTERVAL = 2000; // 减少到2秒更新一次
  private notifyTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // 新增：按钮ID到设备信息的映射缓存
  private buttonToDeviceMap = new Map<string, { deviceId: string; relayIndex: number }>();

  // 新增：公开方法以获取按钮映射
  public getButtonMapping(buttonId: string): { deviceId: string; relayIndex: number } | undefined {
    return this.buttonToDeviceMap.get(buttonId);
  }

  constructor() {
    // 延迟启动，等待配置加载完成后再开始状态监控
    this.delayedStart();
  }

  private async delayedStart(): Promise<void> {
    try {
      // 等待配置加载完成
      await configCache.loadConfigs();
      const devices = await configCache.getDevices();
      
      if (devices.length > 0) {
        console.log('Starting device status monitoring for', devices.length, 'devices');
        
        // 构建按钮ID到设备信息的映射
        this.buildButtonToDeviceMap(devices);
        
        // 立即获取一次所有设备状态
        await this.refreshAllDevices();
        this.isInitialized = true;
        // 开始周期性更新
        this.startPeriodicUpdate();
      } else {
        console.warn('No devices found, status monitoring disabled');
      }
    } catch (error) {
      console.error('Failed to start device status monitoring:', error);
    }
  }

  private buildButtonToDeviceMap(devices: DeviceConfig[]): void {
    this.buttonToDeviceMap.clear();
    devices.forEach(device => {
      device.buttons.forEach(button => {
        this.buttonToDeviceMap.set(button.id, {
          deviceId: device.id,
          relayIndex: button.relayIndex
        });
      });
    });
    console.log('Built button to device map:', Object.fromEntries(this.buttonToDeviceMap));
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
    }
    
    this.notifyTimeout = setTimeout(() => {
      this.subscribers.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
      this.notifyTimeout = null;
    }, 100);
  }

  getDeviceOnlineStatus(deviceId: string): { isOnline: boolean; isStale: boolean } {
    const cached = this.cache.get(deviceId);
    if (!cached) {
      return { isOnline: false, isStale: true };
    }

    const isStale = Date.now() - cached.lastUpdate > this.CACHE_TTL;
    return { isOnline: cached.isOnline, isStale };
  }

  getDeviceRelayStates(deviceId: string): { states: number[]; isStale: boolean } {
    const cached = this.cache.get(deviceId);
    if (!cached) {
      return { states: [], isStale: true };
    }

    const isStale = Date.now() - cached.lastUpdate > this.CACHE_TTL;
    return { states: cached.relayStates, isStale };
  }

  // 新增：根据按钮ID获取继电器状态
  getButtonState(buttonId: string): { state: boolean; isStale: boolean } {
    const mapping = this.buttonToDeviceMap.get(buttonId);
    if (!mapping) {
      console.warn(`Button ${buttonId} not found in device mapping`);
      return { state: false, isStale: true };
    }

    const cached = this.cache.get(mapping.deviceId);
    if (!cached) {
      return { state: false, isStale: true };
    }

    const isStale = Date.now() - cached.lastUpdate > this.CACHE_TTL;
    const relayState = cached.relayStates[mapping.relayIndex];
    
    return { 
      state: relayState === 1, 
      isStale 
    };
  }

  async refreshDevice(deviceId: string): Promise<void> {
    const cached = this.cache.get(deviceId);
    if (cached && cached.isUpdating) {
      return;
    }

    this.updateCacheEntry(deviceId, { isUpdating: true });

    try {
      const [onlineStatus, relayStates] = await Promise.all([
        this.fetchDeviceOnlineStatus(deviceId),
        this.fetchDeviceRelayStates(deviceId)
      ]);

      this.updateCacheEntry(deviceId, {
        isOnline: onlineStatus,
        relayStates: relayStates,
        lastUpdate: Date.now(),
        isUpdating: false
      });
    } catch (error) {
      console.error(`Failed to refresh device ${deviceId}:`, error);
      this.updateCacheEntry(deviceId, {
        isOnline: false,
        relayStates: [],
        lastUpdate: Date.now(),
        isUpdating: false
      });
    }
  }

  async refreshAllDevices(): Promise<void> {
    try {
      const devices = await configCache.getDevices();
      if (devices.length === 0) return;

      console.log('Refreshing status for', devices.length, 'devices');
      
      // 暂停通知
      const originalNotify = this.notifySubscribers;
      this.notifySubscribers = () => {};
      
      const refreshPromises = devices.map(device => this.refreshDevice(device.id));
      await Promise.all(refreshPromises);
      
      // 恢复通知并发送一次
      this.notifySubscribers = originalNotify;
      this.notifySubscribers();
    } catch (error) {
      console.error('Failed to refresh all devices:', error);
    }
  }

  private startPeriodicUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.refreshAllDevices();
    }, this.UPDATE_INTERVAL);

    console.log('Periodic status update started');
  }

  stopPeriodicUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateCacheEntry(deviceId: string, updates: Partial<{
    isOnline: boolean;
    relayStates: number[];
    lastUpdate: number;
    isUpdating: boolean;
  }>) {
    const existing = this.cache.get(deviceId) || {
      isOnline: false,
      relayStates: [],
      lastUpdate: 0,
      isUpdating: false
    };

    const newEntry = { ...existing, ...updates };
    
    // 检查是否有实际变化
    const hasOnlineChange = existing.isOnline !== newEntry.isOnline;
    const hasRelayChange = JSON.stringify(existing.relayStates) !== JSON.stringify(newEntry.relayStates);
    
    this.cache.set(deviceId, newEntry);
    
    // 只在状态真正变化时通知
    if ((hasOnlineChange || hasRelayChange) && !updates.isUpdating) {
      console.log(`Device ${deviceId} status changed:`, {
        online: newEntry.isOnline,
        relays: newEntry.relayStates
      });
      this.notifySubscribers();
    }
  }

  private async fetchDeviceOnlineStatus(deviceId: string): Promise<boolean> {
    try {
      const response = await api.get(`/relay/device/${deviceId}/online-status`);
      return response.data?.isOnline || false;
    } catch (error) {
      console.error(`Error fetching online status for ${deviceId}:`, error);
      return false;
    }
  }

  private async fetchDeviceRelayStates(deviceId: string): Promise<number[]> {
    try {
      const response = await api.get(`/relay/device/${deviceId}/relay-state`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching relay states for ${deviceId}:`, error);
      return [];
    }
  }

  // 修改：获取设备状态时包含按钮状态映射
  getAllCachedStates() {
    const result: Record<string, any> = {};
    this.cache.forEach((value, key) => {
      result[key] = {
        ...value,
        isStale: Date.now() - value.lastUpdate > this.CACHE_TTL
      };
    });
    return result;
  }

  // 新增：获取所有按钮状态
  getAllButtonStates(): Record<string, { state: boolean; isStale: boolean; deviceId: string; isOnline: boolean }> {
    const result: Record<string, any> = {};
    
    this.buttonToDeviceMap.forEach((mapping, buttonId) => {
      const cached = this.cache.get(mapping.deviceId);
      const isStale = !cached || Date.now() - cached.lastUpdate > this.CACHE_TTL;
      const relayState = cached?.relayStates[mapping.relayIndex] || 0;
      
      result[buttonId] = {
        state: relayState === 1,
        isStale,
        deviceId: mapping.deviceId,
        isOnline: cached?.isOnline || false
      };
    });
    
    return result;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // 新增：立即刷新特定设备（用于按钮操作后）
  async forceRefreshDevice(deviceId: string): Promise<void> {
    console.log(`Force refreshing device ${deviceId}`);
    
    try {
      const [onlineStatus, relayStates] = await Promise.all([
        this.fetchDeviceOnlineStatus(deviceId),
        this.fetchDeviceRelayStates(deviceId)
      ]);

      this.updateCacheEntry(deviceId, {
        isOnline: onlineStatus,
        relayStates: relayStates,
        lastUpdate: Date.now(),
        isUpdating: false
      });
      
      console.log(`Force refresh completed for device ${deviceId}:`, {
        online: onlineStatus,
        relays: relayStates
      });
    } catch (error) {
      console.error(`Failed to force refresh device ${deviceId}:`, error);
    }
  }
}

// 创建全局缓存实例
export const configCache = new ConfigCache();
export const deviceStatusCache = new DeviceStatusCache();

// 修改的API函数 - 使用新的缓存架构
export const getRooms = async (): Promise<{ rooms: RoomInfo[] }> => {
  return await configCache.getRooms();
};

export const getAllDevices = async (): Promise<DeviceConfig[]> => {
  return await configCache.getDevices();
};

// 立即可用的配置获取函数
export const getRoomsSync = (): { rooms: RoomInfo[] } | null => {
  return configCache.getRoomsSync();
};

export const getAllDevicesSync = (): DeviceConfig[] | null => {
  return configCache.getDevicesSync();
};

// 设备状态API
export const getDeviceOnlineStatus = async (deviceId: string): Promise<{ success: boolean; deviceId: string; isOnline: boolean }> => {
  const cached = deviceStatusCache.getDeviceOnlineStatus(deviceId);
  
  if (!cached.isStale) {
    return {
      success: true,
      deviceId,
      isOnline: cached.isOnline
    };
  }

  deviceStatusCache.refreshDevice(deviceId);
  
  return {
    success: true,
    deviceId,
    isOnline: cached.isOnline
  };
};

export const getDeviceState = async (deviceId: string): Promise<number[]> => {
  const cached = deviceStatusCache.getDeviceRelayStates(deviceId);
  
  if (!cached.isStale) {
    return cached.states;
  }

  deviceStatusCache.refreshDevice(deviceId);
  return cached.states;
};

// 新增：获取按钮状态的API
export const getButtonState = (buttonId: string): { state: boolean; isStale: boolean } => {
  return deviceStatusCache.getButtonState(buttonId);
};

// 新增：获取所有按钮状态的API
export const getAllButtonStates = (): Record<string, { state: boolean; isStale: boolean; deviceId: string; isOnline: boolean }> => {
  return deviceStatusCache.getAllButtonStates();
};

export const getAllDevicesStatus = (): Record<string, { isOnline: boolean; relayStates: number[]; isStale: boolean }> => {
  return deviceStatusCache.getAllCachedStates();
};

export const subscribeToDeviceStatusChanges = (callback: () => void): (() => void) => {
  return deviceStatusCache.subscribe(callback);
};

// 检查缓存是否准备就绪
export const isDeviceStatusReady = (): boolean => {
  return deviceStatusCache.isReady();
};

// 设备管理 API
export const getDevice = async (deviceId: string): Promise<DeviceConfig> => {
  try {
    const response = await api.get<DeviceConfig>(`/relay/device/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device:', error);
    throw error;
  }
};

// 设备状态 API
export const getInputState = async (deviceId: string): Promise<number[]> => {
  try {
    const response = await api.get<number[]>(`/relay/device/${deviceId}/input-state`);
    return response.data;
  } catch (error) {
    console.error('Error fetching input state:', error);
    throw error;
  }
};

// 继电器控制 API - 通过按钮ID
export const turnButtonOn = async (buttonId: string): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await api.post(`/relay/buttons/${buttonId}/on`);
    return response.data;
  } catch (error) {
    console.error('Error turning button on:', error);
    throw error;
  }
};

export const turnButtonOff = async (buttonId: string): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await api.post(`/relay/buttons/${buttonId}/off`);
    return response.data;
  } catch (error) {
    console.error('Error turning button off:', error);
    throw error;
  }
};

// 继电器控制 API - 通过设备ID和继电器索引
export const turnRelayOn = async (deviceId: string, relayIndex: number): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`/relay/device/${deviceId}/${relayIndex}/on`);
    return response.data;
  } catch (error) {
    console.error('Error turning relay on:', error);
    throw error;
  }
};

export const turnRelayOff = async (deviceId: string, relayIndex: number): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`/relay/device/${deviceId}/${relayIndex}/off`);
    return response.data;
  } catch (error) {
    console.error('Error turning relay off:', error);
    throw error;
  }
};

// 通用切换按钮状态方法
export const toggleButton = async (buttonId: string, state: boolean): Promise<void> => {
  try {
    if (state) {
      await turnButtonOn(buttonId);
    } else {
      await turnButtonOff(buttonId);
    }
    
    // 立即强制刷新设备状态（多次尝试确保获取最新状态）
    const buttonMapping = deviceStatusCache.getButtonMapping(buttonId);
    if (buttonMapping) {
      console.log(`Triggering immediate refresh for device ${buttonMapping.deviceId} after button toggle`);
      
      // 立即刷新一次
      deviceStatusCache.forceRefreshDevice(buttonMapping.deviceId);
      
      // 500ms后再刷新一次，确保状态同步
      setTimeout(() => {
        deviceStatusCache.forceRefreshDevice(buttonMapping.deviceId);
      }, 500);
      
      // 1秒后再刷新一次
      setTimeout(() => {
        deviceStatusCache.forceRefreshDevice(buttonMapping.deviceId);
      }, 1000);
    }
  } catch (error) {
    console.error('Error toggling button state:', error);
    throw error;
  }
};

// 新增：根据按钮ID强制刷新对应设备状态
export const forceRefreshButtonDeviceStatus = (buttonId: string): void => {
  const buttonMapping = deviceStatusCache.getButtonMapping(buttonId);
  if (buttonMapping) {
    deviceStatusCache.forceRefreshDevice(buttonMapping.deviceId);
  }
};

// WebSocket 客户端类
export class RelayWebSocketClient {
  private socket: Socket | null = null;
  private callbacks: {
    onInitialState?: (data: DeviceStatus) => void;
    onStateChanged?: (event: StateChangeEvent) => void;
    onDeviceStatus?: (data: DeviceStatus) => void;
    onSubscribed?: (data: { deviceId: string }) => void;
    onUnsubscribed?: (data: { deviceId: string }) => void;
    onError?: (error: { message: string; error: string }) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  } = {};

  connect(baseUrl: string = 'https://192.168.8.145:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(`${baseUrl}/relay`, {
          transports: ['websocket'],
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket 连接成功');
          this.callbacks.onConnect?.();
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket 断开连接');
          this.callbacks.onDisconnect?.();
        });

        this.socket.on('initialState', (data: DeviceStatus) => {
          this.callbacks.onInitialState?.(data);
        });

        this.socket.on('stateChanged', (event: StateChangeEvent) => {
          this.callbacks.onStateChanged?.(event);
        });

        this.socket.on('deviceStatus', (data: DeviceStatus) => {
          this.callbacks.onDeviceStatus?.(data);
        });

        this.socket.on('subscribed', (data: { deviceId: string }) => {
          this.callbacks.onSubscribed?.(data);
        });

        this.socket.on('unsubscribed', (data: { deviceId: string }) => {
          this.callbacks.onUnsubscribed?.(data);
        });

        this.socket.on('error', (error: { message: string; error: string }) => {
          this.callbacks.onError?.(error);
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket 连接错误:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 设置事件回调
  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 获取设备状态
  getDeviceStatus(deviceId: string): void {
    this.socket?.emit('getDeviceStatus', { deviceId });
  }

  // 订阅设备状态变化
  subscribeDevice(deviceId: string): void {
    this.socket?.emit('subscribeDevice', { deviceId });
  }

  // 取消订阅设备
  unsubscribeDevice(deviceId: string): void {
    this.socket?.emit('unsubscribeDevice', { deviceId });
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// 创建单例 WebSocket 客户端
export const relayWebSocket = new RelayWebSocketClient();

export default api;

// 在页面卸载时清理资源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    deviceStatusCache.stopPeriodicUpdate();
  });
}