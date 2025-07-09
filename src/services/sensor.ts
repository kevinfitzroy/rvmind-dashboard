import {api} from './apiConfig'

// 液位传感器数据接口
export interface LevelSensorData {
  level: number;
  levelPercentage: number;
  timestamp: string;
}

// API 响应接口
export interface LevelSensorResponse {
  success: boolean;
  data: LevelSensorData;
  updateTime: string;
  isFresh: boolean;
}

// 液位传感器管理类
export class LevelSensorManager {
  private data: LevelSensorData | null = null;
  private isFresh = false;
  private updateTime = '';
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<(data: LevelSensorData | null) => void> = [];

  // 获取液位传感器数据
  async fetchLevelData(): Promise<LevelSensorResponse | null> {
    try {
      const response = await api.get<LevelSensorResponse>('/sensor/level');
      
      if (response.data.success) {
        this.data = response.data.data;
        this.isFresh = response.data.isFresh;
        this.updateTime = response.data.updateTime;
        
        // 通知所有监听器
        this.notifyListeners();
        
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('获取液位传感器数据失败:', error);
      return null;
    }
  }

  // 开始定时更新
  startPeriodicUpdate(intervalMs: number = 5000) {
    if (this.intervalId) {
      this.stopPeriodicUpdate();
    }

    // 立即获取一次数据
    this.fetchLevelData();

    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.fetchLevelData();
    }, intervalMs);
  }

  // 停止定时更新
  stopPeriodicUpdate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 获取当前数据
  getCurrentData() {
    return {
      data: this.data,
      isFresh: this.isFresh,
      updateTime: this.updateTime
    };
  }

  // 获取原始液位值
  getLevel(): number | null {
    return this.data?.level ?? null;
  }

  // 获取液位百分比
  getLevelPercentage(): number | null {
    return this.data?.levelPercentage ?? null;
  }

  // 添加数据变化监听器
  addListener(callback: (data: LevelSensorData | null) => void) {
    this.listeners.push(callback);
  }

  // 移除监听器
  removeListener(callback: (data: LevelSensorData | null) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.data));
  }

  // 销毁实例
  destroy() {
    this.stopPeriodicUpdate();
    this.listeners = [];
  }
}

// 黑水箱传感器管理类（暂时使用模拟数据）
export class BlackWaterSensorManager {
  private data: LevelSensorData | null = null;
  private isFresh = false;
  private updateTime = '';
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<(data: LevelSensorData | null) => void> = [];

  // 模拟获取黑水箱数据
  async fetchLevelData(): Promise<LevelSensorResponse | null> {
    try {
      // 模拟数据，稍后替换为真实API调用
      const mockData: LevelSensorResponse = {
        success: true,
        data: {
          level: 45 + Math.random() * 10, // 模拟原始值 45-55
          levelPercentage: 60 + Math.random() * 15, // 模拟百分比 60-75%
          timestamp: new Date().toISOString()
        },
        updateTime: new Date().toISOString(),
        isFresh: true
      };

      this.data = mockData.data;
      this.isFresh = mockData.isFresh;
      this.updateTime = mockData.updateTime;
      
      // 通知所有监听器
      this.notifyListeners();
      
      return mockData;
    } catch (error) {
      console.error('获取黑水箱传感器数据失败:', error);
      return null;
    }
  }

  // 开始定时更新
  startPeriodicUpdate(intervalMs: number = 5000) {
    if (this.intervalId) {
      this.stopPeriodicUpdate();
    }

    // 立即获取一次数据
    this.fetchLevelData();

    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.fetchLevelData();
    }, intervalMs);
  }

  // 停止定时更新
  stopPeriodicUpdate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 获取当前数据
  getCurrentData() {
    return {
      data: this.data,
      isFresh: this.isFresh,
      updateTime: this.updateTime
    };
  }

  // 获取原始液位值
  getLevel(): number | null {
    return this.data?.level ?? null;
  }

  // 获取液位百分比
  getLevelPercentage(): number | null {
    return this.data?.levelPercentage ?? null;
  }

  // 添加数据变化监听器
  addListener(callback: (data: LevelSensorData | null) => void) {
    this.listeners.push(callback);
  }

  // 移除监听器
  removeListener(callback: (data: LevelSensorData | null) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.data));
  }

  // 销毁实例
  destroy() {
    this.stopPeriodicUpdate();
    this.listeners = [];
  }
}

// 水箱数据统一接口
export interface WaterTankSensorData {
  id: string;
  name: string;
  location: string;
  capacity: number; // 总容量(L)
  currentLevel: number; // 当前液位原始值
  levelPercentage: number; // 液位百分比
  status: string;
  isFresh: boolean;
  updateTime: string;
}

// 创建全局实例
export const levelSensorManager = new LevelSensorManager();
export const blackWaterSensorManager = new BlackWaterSensorManager();

// 便捷函数
export const getLevelSensorData = () => levelSensorManager.getCurrentData();
export const getBlackWaterSensorData = () => blackWaterSensorManager.getCurrentData();
export const startLevelSensorUpdate = (intervalMs?: number) => levelSensorManager.startPeriodicUpdate(intervalMs);
export const startBlackWaterSensorUpdate = (intervalMs?: number) => blackWaterSensorManager.startPeriodicUpdate(intervalMs);
export const stopLevelSensorUpdate = () => levelSensorManager.stopPeriodicUpdate();
export const stopBlackWaterSensorUpdate = () => blackWaterSensorManager.stopPeriodicUpdate();

// 获取所有水箱传感器数据
export const getAllWaterTankData = (): WaterTankSensorData[] => {
  const freshWaterData = levelSensorManager.getCurrentData();
  const blackWaterData = blackWaterSensorManager.getCurrentData();
  
  const tanks: WaterTankSensorData[] = [];
  
  // 清水箱数据
  if (freshWaterData.data) {
    tanks.push({
      id: 'fresh-water',
      name: '清水箱',
      location: '车体尾部',
      capacity: 100, // 假设容量100L
      currentLevel: freshWaterData.data.level,
      levelPercentage: freshWaterData.data.levelPercentage,
      status: freshWaterData.data.levelPercentage > 20 ? '正常' : '需要补水',
      isFresh: freshWaterData.isFresh,
      updateTime: freshWaterData.updateTime
    });
  }
  
  // 黑水箱数据
  if (blackWaterData.data) {
    tanks.push({
      id: 'black-water',
      name: '黑水箱',
      location: '车体前部',
      capacity: 80, // 假设容量80L
      currentLevel: blackWaterData.data.level,
      levelPercentage: blackWaterData.data.levelPercentage,
      status: blackWaterData.data.levelPercentage < 80 ? '正常' : '需要排放',
      isFresh: blackWaterData.isFresh,
      updateTime: blackWaterData.updateTime
    });
  }
  
  return tanks;
};
