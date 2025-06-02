import React from 'react';
import { WaterTankData } from '../../types';
import { Droplets } from 'lucide-react';

interface WaterTankIndicatorProps {
  tank: WaterTankData;
}

const WaterTankIndicator: React.FC<WaterTankIndicatorProps> = ({ tank }) => {
  const fillPercentage = (tank.currentLevel / tank.capacity) * 100;

  const getStatusColor = () => {
    if (fillPercentage > 70) return 'text-green-600';
    if (fillPercentage > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFillColor = () => {
    if (fillPercentage > 70) return 'bg-gradient-to-t from-blue-400 to-blue-300';
    if (fillPercentage > 30) return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
    return 'bg-gradient-to-t from-red-400 to-red-300';
  };

  return (
    <div className="bg-white/70 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="text-center mb-3">
        <h4 className="text-sm font-semibold text-gray-800">{tank.name}</h4>
        <p className="text-xs text-gray-600 mt-1">{tank.location}</p>
      </div>

      <div className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden mb-3">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getFillColor()}`}
          style={{ height: `${fillPercentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-1 rounded">
            {Math.round(fillPercentage)}%
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-600">
          {tank.currentLevel}L / {tank.capacity}L
        </p>
        <p className={`text-xs font-medium mt-1 ${getStatusColor()}`}>
          {tank.status}
        </p>
      </div>
    </div>
  );
};

export default WaterTankIndicator;