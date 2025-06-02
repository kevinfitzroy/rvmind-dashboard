import React from 'react';
import { BatteryData } from '../../types';

const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ battery }) => {
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

  return (
    <div className="bg-white/70 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">{battery.name}</h4>
        <span className="text-lg">{getStatusIcon()}</span>
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
          <span className="font-medium">{battery.voltage}V</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">温度:</span>
          <span className="font-medium">{battery.temperature}°C</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">状态:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {battery.isCharging ? '充电中' : battery.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BatteryIndicator;