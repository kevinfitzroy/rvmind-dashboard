import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Sun, Car, Plug } from 'lucide-react';
import { BatteryData } from '../../types';
import { getPmsData } from '../../services/batteryApi';

interface BatteryIndicatorProps {
  battery: BatteryData;
}

const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ battery }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (battery.id === 'backup-battery') {
      navigate('/battery/backup');
    } else if (battery.id === 'main-battery') {
      navigate('/battery/main');
    }
  };

  const getStatusColor = () => {
    if (battery.percentage > 70) return 'text-green-600';
    if (battery.percentage > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBatteryColor = () => {
    if (battery.percentage > 70) return 'bg-gradient-to-r from-green-400 to-green-500';
    if (battery.percentage > 30) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    return 'bg-gradient-to-r from-red-400 to-red-500';
  };

  const getStatusIcon = () => {
    if (battery.isCharging) return '🔌';
    if (battery.percentage > 30) return '🔋';
    if (battery.percentage > 10) return '🪫';
    return '🔴';
  };

  const getDataStatus = () => {
    if (battery.isFresh === false) return '🔴 数据不新鲜';
    return '🟢 数据正常';
  };

  const isClickable = battery.id === 'backup-battery' || battery.id === 'main-battery';

  // 充电渠道组件
  const ChargingChannel: React.FC<{
    icon: React.ReactNode;
    name: string;
    isActive: boolean;
    power: number;
    current?: number;
    voltage?: number;
    size?: 'small' | 'medium';
  }> = ({ icon, name, isActive, power, current, voltage, size = 'small' }) => {
    const cardSize = size === 'medium' ? 'px-2 py-2' : 'px-2 py-1.5';
    const textSize = size === 'medium' ? 'text-xs' : 'text-xs';
    
    return (
      <div className={`
        ${cardSize} rounded border transition-all duration-300
        ${isActive 
          ? 'bg-green-100 border-green-300 shadow-sm' 
          : 'bg-gray-50 border-gray-200'
        }
      `}>
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <div className={`${isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {icon}
            </div>
            <span className={`${textSize} font-medium ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {name}
            </span>
          </div>
          <div className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
            {isActive ? '活跃' : '待机'}
          </div>
        </div>
        
        {/* 数据行 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">功率:</span>
            <span className={`font-medium ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {isActive ? `${power.toFixed(0)}W` : '0W'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">电流:</span>
            <span className={`font-medium ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {isActive && current !== undefined ? `${current.toFixed(1)}A` : '0A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 获取充电渠道数据
  const getChargingChannels = () => {
    // 获取PMS数据用于发动机充电信息
    const { raw: pmsRaw } = getPmsData();
    
    if (battery.id === 'main-battery') {
      // 主电池的3个充电渠道
      const isCharging = battery.isCharging && battery.power && battery.power > 0;
      const mainPower = isCharging ? Math.abs(battery.power ?? 0) : 0;
      const mainCurrent = battery.current ? Math.abs(battery.current) : 0;
      
      // 发动机高压直流充电数据 - 使用真实PMS数据
      const isgCurrent = pmsRaw?.RCU_Status01?.isgCurOutput || 0;
      const isgPower = isgCurrent * battery.voltage;
      const isIsgCharging = isgCurrent > 1; // 电流大于1A认为是在充电
      
      return [
        {
          icon: <Zap className="w-3 h-3" />,
          name: '发电机高压直流',
          isActive: isIsgCharging,
          power: isIsgCharging ? isgPower : 0,
          current: isIsgCharging ? isgCurrent : 0,
          voltage: battery.voltage
        },
        {
          icon: <Car className="w-3 h-3" />,
          name: '充电桩高压直流',
          isActive: isCharging && mainPower > 500 && mainPower <= 1000, // 保持原有逻辑
          power: isCharging && mainPower > 500 && mainPower <= 1000 ? mainPower : 0,
          current: isCharging && mainPower > 500 && mainPower <= 1000 ? mainCurrent : 0,
          voltage: battery.voltage
        },
        {
          icon: <Plug className="w-3 h-3" />,
          name: 'OBC交流充电',
          isActive: isCharging && mainPower <= 500, // 保持原有逻辑
          power: isCharging && mainPower <= 500 ? mainPower : 0,
          current: isCharging && mainPower <= 500 ? mainCurrent : 0,
          voltage: battery.voltage
        }
      ];
    } else {
      // 备用电池的2个充电渠道
      const isCharging = battery.isCharging && battery.power && battery.power > 0;
      const backupPower = isCharging ? Math.abs(battery.power ?? 0) : 0;
      const backupCurrent = battery.current ? Math.abs(battery.current) : 0;
      
      return [
        {
          icon: <Sun className="w-3 h-3" />,
          name: '太阳能',
          isActive: isCharging && backupPower > 100, // 模拟条件
          power: isCharging && backupPower > 100 ? backupPower * 0.7 : 0,
          current: isCharging && backupPower > 100 ? backupCurrent * 0.7 : 0,
          voltage: battery.voltage
        },
        {
          icon: <Plug className="w-3 h-3" />,
          name: '交流充电机',
          isActive: isCharging && backupPower <= 100, // 模拟条件
          power: isCharging && backupPower <= 100 ? backupPower : 0,
          current: isCharging && backupPower <= 100 ? backupCurrent : 0,
          voltage: battery.voltage
        }
      ];
    }
  };

  const chargingChannels = getChargingChannels();

  return (
    <div 
      className={`bg-white/70 rounded-lg p-4 shadow-md transition-all duration-200 ${
        isClickable 
          ? 'hover:shadow-lg hover:bg-white/80 cursor-pointer transform hover:scale-105' 
          : 'hover:shadow-lg'
      }`}
      onClick={handleClick}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">{battery.name}</h4>
        <div className="flex items-center gap-1">
          <span className="text-lg">{getStatusIcon()}</span>
          {isClickable && <span className="text-xs text-blue-500">👆</span>}
        </div>
      </div>
      
      {/* 电量显示 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-600">电量</span>
          <span className={`text-sm font-bold ${getStatusColor()}`}>
            {battery.percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getBatteryColor()}`}
            style={{ width: `${battery.percentage}%` }}
          />
        </div>
      </div>
      
      {/* 详细信息 */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">电压:</span>
          <span className="font-medium">{battery.voltage.toFixed(2)}V</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">温度:</span>
          <span className="font-medium">{battery.temperature}°C</span>
        </div>
        {battery.current !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">电流:</span>
            <span className="font-medium">{battery.current.toFixed(2)}A</span>
          </div>
        )}
        {battery.power !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">功率:</span>
            <span className="font-medium">{battery.power.toFixed(2)}W</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">状态:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {battery.status}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">数据:</span>
          <span className="text-xs">{getDataStatus()}</span>
        </div>
      </div>

      {/* 充电渠道显示 */}
      <div className="border-t pt-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-700">充电渠道</span>
          <span className="text-xs text-gray-500">
            {chargingChannels.filter(c => c.isActive).length}/{chargingChannels.length} 活跃
          </span>
        </div>
        <div className="space-y-2">
          {chargingChannels.map((channel, index) => (
            <ChargingChannel
              key={index}
              icon={channel.icon}
              name={channel.name}
              isActive={!!channel.isActive}
              power={channel.power}
              current={channel.current}
              voltage={channel.voltage}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatteryIndicator;