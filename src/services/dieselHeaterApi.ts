import {api} from './apiConfig'

// 柴油加热器状态接口
export interface DieselHeaterStatus {
  isRunning: boolean;
  isHeating: boolean;
  workStatus: number;
  workMode: number;
  ignitionStatus: number;
  workStatusText: string;
  workModeText: string;
  ignitionStatusText: string;
  inletTemperature: number;
  outletTemperature: number;
  targetTemperature: number;
  voltage: number;
  faultCode: number;
  faultText: string;
  lastUpdateTime: string;
}

// 控制状态接口
export interface ControlState {
  on: boolean;
  heating: boolean;
  hasActiveControl: boolean;
  targetTemperature: number;
}

// 详细状态接口
export interface DetailedStatus extends DieselHeaterStatus {
  controlState: ControlState;
  connectionStatus: boolean;
  online: boolean;
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

// 设置温度DTO
export interface SetTemperatureDto {
  temperature: number;
}

// 连接状态接口
export interface ConnectionStatus {
  isConnected: boolean;
  controlState: ControlState;
}

// 健康检查数据接口
export interface HealthData {
  isConnected: boolean;
  lastUpdateTime: string;
  timeSinceLastUpdate: string;
  isOnline: boolean;
}

// 柴油加热器管理类
export class DieselHeaterManager {
  private status: DetailedStatus | null = null;
  private connectionStatus: ConnectionStatus | null = null;
  private healthData: HealthData | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<(status: DetailedStatus | null) => void> = [];

  // 获取详细状态信息
  async fetchDetailedStatus(): Promise<ApiResponse<DetailedStatus> | null> {
    try {
      const response = await api.get<ApiResponse<DetailedStatus>>('/diesel-heater/status');
      
      if (response.data.success && response.data.data) {
        this.status = response.data.data;
        
        // 通知所有监听器
        this.notifyListeners();
        
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('获取柴油加热器状态失败:', error);
      return null;
    }
  }

  // 启动加热器并开始加热
  async startHeaterWithHeating(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/start-with-heating');
      
      if (response.data.success) {
        // 操作成功后立即更新状态
        await this.fetchDetailedStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('启动加热器并开始加热失败:', error);
      throw error;
    }
  }

  // 启动加热器但不加热
  async startHeaterWithoutHeating(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/start-without-heating');
      
      if (response.data.success) {
        // 操作成功后立即更新状态
        await this.fetchDetailedStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('启动加热器但不加热失败:', error);
      throw error;
    }
  }

  // 停止加热器
  async stopHeater(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/stop');
      
      if (response.data.success) {
        // 操作成功后立即更新状态
        await this.fetchDetailedStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('停止加热器失败:', error);
      throw error;
    }
  }

  // 切换加热状态
  async toggleHeating(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/toggle-heating');
      
      if (response.data.success) {
        // 操作成功后立即更新状态
        await this.fetchDetailedStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('切换加热状态失败:', error);
      throw error;
    }
  }

  // 设置目标温度
  async setTargetTemperature(temperature: number): Promise<ApiResponse | null> {
    try {
      const response = await api.put<ApiResponse>('/diesel-heater/temperature', { temperature });
      
      if (response.data.success) {
        // 操作成功后立即更新状态
        await this.fetchDetailedStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('设置目标温度失败:', error);
      throw error;
    }
  }

  // 获取连接状态
  async fetchConnectionStatus(): Promise<ApiResponse<ConnectionStatus> | null> {
    try {
      const response = await api.get<ApiResponse<ConnectionStatus>>('/diesel-heater/connection-status');
      
      if (response.data.success && response.data.data) {
        this.connectionStatus = response.data.data;
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('获取连接状态失败:', error);
      return null;
    }
  }

  // 获取控制状态
  async fetchControlState(): Promise<ApiResponse<ControlState> | null> {
    try {
      const response = await api.get<ApiResponse<ControlState>>('/diesel-heater/control-state');
      
      return response.data;
    } catch (error) {
      console.error('获取控制状态失败:', error);
      return null;
    }
  }

  // 健康检查
  async fetchHealthCheck(): Promise<ApiResponse<HealthData> | null> {
    try {
      const response = await api.get<ApiResponse<HealthData>>('/diesel-heater/health');
      
      if (response.data.success && response.data.data) {
        this.healthData = response.data.data;
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('健康检查失败:', error);
      return null;
    }
  }

  // 连接第二个端口（加热器控制端口）
  async connectSecondPort(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/connect');
      
      if (response.data.success) {
        // 连接成功后更新连接状态
        await this.fetchConnectionStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('连接加热器控制端口失败:', error);
      throw error;
    }
  }

  // 断开第二个端口连接
  async disconnectSecondPort(): Promise<ApiResponse | null> {
    try {
      const response = await api.post<ApiResponse>('/diesel-heater/disconnect');
      
      if (response.data.success) {
        // 断开连接后更新连接状态
        await this.fetchConnectionStatus();
      }
      
      return response.data;
    } catch (error) {
      console.error('断开加热器控制端口失败:', error);
      throw error;
    }
  }

  // 开始定时更新
  startPeriodicUpdate(intervalMs: number = 2000) {
    if (this.intervalId) {
      this.stopPeriodicUpdate();
    }

    // 立即获取一次数据
    this.fetchDetailedStatus();

    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.fetchDetailedStatus();
    }, intervalMs);
  }

  // 停止定时更新
  stopPeriodicUpdate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 获取当前状态
  getCurrentStatus(): DetailedStatus | null {
    return this.status;
  }

  // 获取当前连接状态
  getCurrentConnectionStatus(): ConnectionStatus | null {
    return this.connectionStatus;
  }

  // 获取当前健康数据
  getCurrentHealthData(): HealthData | null {
    return this.healthData;
  }

  // 获取当前温度信息
  getTemperatureInfo() {
    if (!this.status) return null;
    
    return {
      inletTemperature: this.status.inletTemperature,
      outletTemperature: this.status.outletTemperature,
      targetTemperature: this.status.targetTemperature
    };
  }

  // 获取运行状态信息
  getRunningInfo() {
    if (!this.status) return null;
    
    return {
      isRunning: this.status.isRunning,
      isHeating: this.status.isHeating,
      workStatusText: this.status.workStatusText,
      workModeText: this.status.workModeText,
      ignitionStatusText: this.status.ignitionStatusText
    };
  }

  // 获取故障信息
  getFaultInfo() {
    if (!this.status) return null;
    
    return {
      faultCode: this.status.faultCode,
      faultText: this.status.faultText,
      voltage: this.status.voltage
    };
  }

  // 检查是否在线
  isOnline(): boolean {
    return this.status?.online || false;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.status?.connectionStatus || false;
  }

  // 添加状态变化监听器
  addListener(callback: (status: DetailedStatus | null) => void) {
    this.listeners.push(callback);
  }

  // 移除监听器
  removeListener(callback: (status: DetailedStatus | null) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.status));
  }

  // 销毁实例
  destroy() {
    this.stopPeriodicUpdate();
    this.listeners = [];
  }
}

// 创建全局实例
export const dieselHeaterManager = new DieselHeaterManager();

// 便捷函数 - 状态获取
export const getDieselHeaterStatus = () => dieselHeaterManager.getCurrentStatus();
export const getDieselHeaterConnectionStatus = () => dieselHeaterManager.getCurrentConnectionStatus();
export const getDieselHeaterHealthData = () => dieselHeaterManager.getCurrentHealthData();
export const getTemperatureInfo = () => dieselHeaterManager.getTemperatureInfo();
export const getRunningInfo = () => dieselHeaterManager.getRunningInfo();
export const getFaultInfo = () => dieselHeaterManager.getFaultInfo();

// 便捷函数 - 状态检查
export const isDieselHeaterOnline = () => dieselHeaterManager.isOnline();
export const isDieselHeaterConnected = () => dieselHeaterManager.isConnected();

// 便捷函数 - 定时更新控制
export const startDieselHeaterUpdate = (intervalMs?: number) => dieselHeaterManager.startPeriodicUpdate(intervalMs);
export const stopDieselHeaterUpdate = () => dieselHeaterManager.stopPeriodicUpdate();

// 便捷函数 - 操作控制
export const startHeaterWithHeating = () => dieselHeaterManager.startHeaterWithHeating();
export const startHeaterWithoutHeating = () => dieselHeaterManager.startHeaterWithoutHeating();
export const stopHeater = () => dieselHeaterManager.stopHeater();
export const toggleHeating = () => dieselHeaterManager.toggleHeating();
export const connectHeaterPort = () => dieselHeaterManager.connectSecondPort();
export const disconnectHeaterPort = () => dieselHeaterManager.disconnectSecondPort();
export const setTargetTemperature = (temperature: number) => dieselHeaterManager.setTargetTemperature(temperature);

// 便捷函数 - 监听器管理
export const addDieselHeaterListener = (callback: (status: DetailedStatus | null) => void) => {
  dieselHeaterManager.addListener(callback);
};

export const removeDieselHeaterListener = (callback: (status: DetailedStatus | null) => void) => {
  dieselHeaterManager.removeListener(callback);
};

// 获取完整的设备信息
export const getDieselHeaterFullInfo = () => {
  const status = getDieselHeaterStatus();
  const connectionStatus = getDieselHeaterConnectionStatus();
  const healthData = getDieselHeaterHealthData();
  
  return {
    status,
    connectionStatus,
    healthData,
    temperatureInfo: getTemperatureInfo(),
    runningInfo: getRunningInfo(),
    faultInfo: getFaultInfo(),
    isOnline: isDieselHeaterOnline(),
    isConnected: isDieselHeaterConnected()
  };
};
