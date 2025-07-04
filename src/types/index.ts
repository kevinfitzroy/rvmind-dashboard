export interface WaterTankData {
  id: string;
  name: string;
  level: number; // 0-100
  capacity: number; // in liters
  type: 'clean' | 'grey' | 'black';
}

export interface BatteryData {
  id: string;
  name: string;
  percentage: number;
  voltage: number;
  temperature: number;
  status: string;
  isCharging: boolean;
  current?: number;
  power?: number;
  cycleCount?: number;
  cellVoltageDifference?: number;
  temperatureDifference?: number;
  isFresh?: boolean;
}

export interface ControlItem {
  id: string;
  name: string;
  icon: string;
  route: string;
  description: string;
}

export interface RoomControl {
  id: string;
  name: string;
  devices: DeviceControl[];
}

export interface DeviceControl {
  id: string;
  name: string;
  type: string;
  status: boolean;
  icon: string;
}