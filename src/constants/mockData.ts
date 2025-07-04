import { WaterTankData, BatteryData, ControlItem } from '../types';
import { 
  Droplets, 
  Battery, 
  Lightbulb, 
  Thermometer, 
  Wifi, 
  Lock, 
  SunMoon, 
  Gauge
} from 'lucide-react';

export const waterTanks: WaterTankData[] = [
  {
    id: 'clean-water',
    name: 'Clean Water',
    level: 75,
    capacity: 100,
    type: 'clean'
  },
  {
    id: 'grey-water',
    name: 'Grey Water',
    level: 40,
    capacity: 80,
    type: 'grey'
  },
  {
    id: 'black-water',
    name: 'Black Water',
    level: 25,
    capacity: 50,
    type: 'black'
  }
];

// 保留 main battery 的模拟数据，backup battery 将使用实际数据
export const batteries: BatteryData[] = [
  {
    id: 'main-battery',
    name: 'Main Battery',
    percentage: 85,
    voltage: 12.7,
    temperature: 25,
    status: '正常',
    isCharging: false,
    current: -5.2,
    power: -67.0,
    cycleCount: 156
  }
];

export const controlItems: ControlItem[] = [
  {
    id: 'lighting',
    name: 'Lighting',
    icon: 'Lightbulb',
    route: '/controls/lighting',
    description: 'Control interior and exterior lights'
  },
  {
    id: 'climate',
    name: 'Climate',
    icon: 'Thermometer',
    route: '/controls/climate',
    description: 'Adjust heating and cooling systems'
  },
  {
    id: 'connectivity',
    name: 'Connectivity',
    icon: 'Wifi',
    route: '/controls/connectivity',
    description: 'Manage WiFi and cellular connections'
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'Lock',
    route: '/controls/security',
    description: 'Door locks and security system'
  },
  {
    id: 'power',
    name: 'Power',
    icon: 'Battery',
    route: '/controls/power',
    description: 'Power management and settings'
  },
  {
    id: 'water',
    name: 'Water Systems',
    icon: 'Droplets',
    route: '/controls/water',
    description: 'Water pumps and heating'
  }
];