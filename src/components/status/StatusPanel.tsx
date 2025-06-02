import React from 'react';
import WeatherCard from '../weather/WeatherCard';
import WaterTankIndicator from './WaterTankIndicator';
import BatteryIndicator from './BatteryIndicator';
import { waterTanks, batteries } from '../../constants/mockData';

const StatusPanel: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <WeatherCard />
      </div>
      <div className="lg:col-span-3">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6 border border-blue-100 h-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">水箱状态</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                {waterTanks.map(tank => (
                  <WaterTankIndicator key={tank.id} tank={tank} />
                ))}
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">电池状态</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {batteries.map(battery => (
                  <BatteryIndicator key={battery.id} battery={battery} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;