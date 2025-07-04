import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryData } from '../../types';

interface BatteryIndicatorProps {
  battery: BatteryData;
}

const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ battery }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (battery.id === 'backup-battery') {
      navigate('/battery/backup');
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
    if (battery.percentage > 70) return '🔋';
    if (battery.percentage > 30) return '🪫';
    return '🔴';
  };

  const getDataStatus = () => {
    if (battery.isFresh === false) return '🔴 数据不新鲜';
    return '🟢 数据正常';
  };

  const isClickable = battery.id === 'backup-battery';

  return (
    <div 
      className={`bg-white/70 rounded-lg p-4 shadow-md transition-all duration-200 ${
        isClickable 
          ? 'hover:shadow-lg hover:bg-white/80 cursor-pointer transform hover:scale-105' 
          : 'hover:shadow-lg'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">{battery.name}</h4>
        <div className="flex items-center gap-1">
          <span className="text-lg">{getStatusIcon()}</span>
          {isClickable && <span className="text-xs text-blue-500">👆</span>}
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-600">电量</span>
          <span className={`text-sm font-bold ${getStatusColor()}`}>
            {battery.percentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getBatteryColor()}`}
            style={{ width: `${battery.percentage}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
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
    </div>
  );
};

export default BatteryIndicator;