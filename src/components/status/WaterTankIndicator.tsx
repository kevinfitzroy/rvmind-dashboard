import React from 'react';
import { Droplets, Wifi, WifiOff } from 'lucide-react';
import { WaterTankSensorData } from '../../services/sensor';

interface WaterTankIndicatorProps {
  tank: WaterTankSensorData;
}

const WaterTankIndicator: React.FC<WaterTankIndicatorProps> = ({ tank }) => {
  const fillPercentage = tank.levelPercentage;

  const getStatusColor = () => {
    if (tank.id === 'fresh-water') {
      // 清水箱：越满越好
      if (fillPercentage > 70) return 'text-green-600';
      if (fillPercentage > 30) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // 黑水箱：越满越危险
      if (fillPercentage > 80) return 'text-red-600';
      if (fillPercentage > 50) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const getFillColor = () => {
    if (tank.id === 'fresh-water') {
      // 清水箱：蓝色系
      if (fillPercentage > 70) return 'bg-gradient-to-t from-blue-400 to-blue-300';
      if (fillPercentage > 30) return 'bg-gradient-to-t from-blue-300 to-blue-200';
      return 'bg-gradient-to-t from-blue-200 to-blue-100';
    } else {
      // 黑水箱：根据容量变色
      if (fillPercentage > 80) return 'bg-gradient-to-t from-red-400 to-red-300';
      if (fillPercentage > 50) return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
      return 'bg-gradient-to-t from-gray-400 to-gray-300';
    }
  };

  return (
    <div className="bg-white/70 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="text-center mb-3">
        <div className="flex items-center justify-center space-x-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-800">{tank.name}</h4>
          {tank.isFresh ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
        </div>
        <p className="text-xs text-gray-600">{tank.location}</p>
      </div>

      <div className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden mb-3">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getFillColor()}`}
          style={{ height: `${Math.min(fillPercentage, 100)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-1 rounded">
            {Math.round(fillPercentage)}%
          </span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-gray-600">
          容量: {tank.capacity}L
        </p>
        <p className={`text-xs font-medium ${getStatusColor()}`}>
          {tank.status}
        </p>
        {/* 原始值显示 - 较小且不显眼 */}
        <p className="text-xs text-gray-400">
          原始值: {tank.currentLevel.toFixed(1)}
        </p>
      </div>
    </div>
  );
};

export default WaterTankIndicator;