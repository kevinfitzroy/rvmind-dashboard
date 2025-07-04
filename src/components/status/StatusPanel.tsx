import React, { useState, useEffect } from 'react';
import WeatherCard from '../weather/WeatherCard';
import WaterTankIndicator from './WaterTankIndicator';
import BatteryIndicator from './BatteryIndicator';
import { waterTanks, batteries } from '../../constants/mockData';
import { BatteryData } from '../../types';
import { getBatteryData, subscribeToBatteryDataChanges, isBatteryDataReady } from '../../services/api';

const StatusPanel: React.FC = () => {
  const [backupBatteryData, setBackupBatteryData] = useState<BatteryData | null>(null);
  const [isLoadingBackup, setIsLoadingBackup] = useState(true);

  useEffect(() => {
    // 转换后端数据为 backup battery 格式
    const convertBackupBatteryData = () => {
      const { data, isStale } = getBatteryData();
      
      if (data) {
        const batteryInfo: BatteryData = {
          id: 'backup-battery',
          name: 'Backup Battery',
          percentage: data.soc,
          voltage: data.totalVoltage,
          temperature: data.maxCellTemperature,
          status: data.chargeDischargeStatusText,
          isCharging: data.chargeDischargeStatus === 1,
          current: data.current,
          power: data.power,
          cycleCount: data.cycleCount,
          cellVoltageDifference: data.cellVoltageDifference,
          temperatureDifference: data.temperatureDifference,
          isFresh: data.isFresh && !isStale
        };
        
        setBackupBatteryData(batteryInfo);
      }
      
      if (isBatteryDataReady()) {
        setIsLoadingBackup(false);
      }
    };

    // 初始加载
    convertBackupBatteryData();

    // 订阅数据变化
    const unsubscribe = subscribeToBatteryDataChanges(() => {
      convertBackupBatteryData();
    });

    return unsubscribe;
  }, []);

  // 合并电池数据：main 使用模拟数据，backup 使用实际数据
  const allBatteries = [
    ...batteries, // main battery 模拟数据
    ...(backupBatteryData ? [backupBatteryData] : []) // backup battery 实际数据
  ];

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
                {/* Main Battery - 使用模拟数据 */}
                {batteries.map(battery => (
                  <BatteryIndicator key={battery.id} battery={battery} />
                ))}
                
                {/* Backup Battery - 使用实际数据或显示加载状态 */}
                {isLoadingBackup ? (
                  <div className="bg-white/70 rounded-lg p-4 shadow-md animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-6 bg-gray-200 rounded w-6"></div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                        <div className="h-4 bg-gray-200 rounded w-10"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ) : backupBatteryData ? (
                  <BatteryIndicator battery={backupBatteryData} />
                ) : (
                  <div className="bg-white/70 rounded-lg p-4 shadow-md">
                    <div className="text-center text-gray-500">
                      <h4 className="text-sm font-semibold mb-2">Backup Battery</h4>
                      <p className="text-xs">暂无数据</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;