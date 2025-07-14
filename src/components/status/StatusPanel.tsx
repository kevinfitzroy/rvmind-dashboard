import React, { useState, useEffect } from 'react';
import { Power, PowerOff, Loader2, AlertTriangle } from 'lucide-react';
import WaterTankIndicator from './WaterTankIndicator';
import BatteryIndicator from './BatteryIndicator';
import { BatteryData } from '../../types';
import { 
  getBatteryData, 
  subscribeToBatteryDataChanges, 
  isBatteryDataReady,
  getAllInverterStatus,
  openMainPowerInverter,
  closeMainPowerInverter,
  openBackupBatteryChargeInverter,
  closeBackupBatteryChargeInverter,
  InverterStatus,
  InverterControlResult
} from '../../services/api';
import { 
  getPmsData,
  subscribeToPmsDataChanges,
  isPmsDataReady,
  BMS_FaultLevel
} from '../../services/batteryApi';
import {
  getAllWaterTankData,
  levelSensorManager,
  blackWaterSensorManager,
  WaterTankSensorData
} from '../../services/sensor';

const StatusPanel: React.FC = () => {
  const [backupBatteryData, setBackupBatteryData] = useState<BatteryData | null>(null);
  const [mainBatteryData, setMainBatteryData] = useState<BatteryData | null>(null);
  const [isLoadingBackup, setIsLoadingBackup] = useState(true);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [waterTankData, setWaterTankData] = useState<WaterTankSensorData[]>([]);
  
  // 逆变器状态管理
  const [inverterStatus, setInverterStatus] = useState<{
    mainPower: InverterStatus;
    backupBattery: InverterStatus;
  } | null>(null);
  const [loading, setLoading] = useState({
    mainPower: false,
    backupBattery: false
  });
  const [error, setError] = useState<string | null>(null);

  // 获取逆变器状态
  const fetchInverterStatus = async () => {
    try {
      const status = await getAllInverterStatus();
      setInverterStatus(status);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch inverter status:', err);
      setError('获取逆变器状态失败');
    }
  };

  // 控制主供电逆变器
  const handleMainPowerToggle = async () => {
    if (!inverterStatus || loading.mainPower) return;
    
    setLoading(prev => ({ ...prev, mainPower: true }));
    try {
      const newState = inverterStatus.mainPower.status === 'OPEN' ? 'CLOSE' : 'OPEN';
      let result: InverterControlResult;
      
      if (newState === 'OPEN') {
        result = await openMainPowerInverter();
      } else {
        result = await closeMainPowerInverter();
      }
      
      if (result.success) {
        await fetchInverterStatus();
      } else {
        setError(result.message || '主供电逆变器控制失败');
      }
    } catch (err) {
      console.error('Failed to control main power inverter:', err);
      setError('主供电逆变器控制失败');
    } finally {
      setLoading(prev => ({ ...prev, mainPower: false }));
    }
  };

  // 控制备用电池充电逆变器
  const handleBackupBatteryToggle = async () => {
    if (!inverterStatus || loading.backupBattery) return;
    
    setLoading(prev => ({ ...prev, backupBattery: true }));
    try {
      const newState = inverterStatus.backupBattery.status === 'OPEN' ? 'CLOSE' : 'OPEN';
      let result: InverterControlResult;
      
      if (newState === 'OPEN') {
        result = await openBackupBatteryChargeInverter();
      } else {
        result = await closeBackupBatteryChargeInverter();
      }
      
      if (result.success) {
        await fetchInverterStatus();
      } else {
        setError(result.message || '备用电池充电逆变器控制失败');
      }
    } catch (err) {
      console.error('Failed to control backup battery inverter:', err);
      setError('备用电池充电逆变器控制失败');
    } finally {
      setLoading(prev => ({ ...prev, backupBattery: false }));
    }
  };

  // 逆变器控制组件
  const InverterControl: React.FC<{
    title: string;
    status: InverterStatus;
    loading: boolean;
    onToggle: () => void;
  }> = ({ title, status, loading, onToggle }) => {
    const isOpen = status.status === 'OPEN';
    const buttonColor = isOpen 
      ? 'bg-green-500 hover:bg-green-600' 
      : 'bg-red-500 hover:bg-red-600';
    const statusColor = isOpen ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className="bg-white/80 rounded-lg p-4 shadow-md border border-white/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800 truncate">{title}</h4>
          <div className={`text-xs font-medium ${statusColor}`}>
            {isOpen ? '开启' : '关闭'}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <Power className="w-4 h-4 text-green-600" />
            ) : (
              <PowerOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs text-gray-600">
              {isOpen ? '运行中' : '已停止'}
            </span>
          </div>
          
          <button
            onClick={onToggle}
            disabled={loading}
            className={`
              flex items-center space-x-1 px-3 py-1 rounded text-white text-xs font-medium
              transition-colors duration-200
              ${buttonColor}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>处理中</span>
              </>
            ) : isOpen ? (
              <>
                <PowerOff className="w-3 h-3" />
                <span>关闭</span>
              </>
            ) : (
              <>
                <Power className="w-3 h-3" />
                <span>开启</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // 转换 PMS 数据为 main battery 格式
    const convertMainBatteryData = () => {
      const { status, isStale } = getPmsData();
      
      if (status && status.bms) {
        const getFaultLevelText = (level: BMS_FaultLevel): string => {
          switch (level) {
            case BMS_FaultLevel.NO_FAULT: return '正常';
            case BMS_FaultLevel.LEVEL_1: return '一级故障';
            case BMS_FaultLevel.LEVEL_2: return '二级故障';
            case BMS_FaultLevel.LEVEL_3: return '三级故障';
            default: return '未知';
          }
        };

        const batteryInfo: BatteryData = {
          id: 'main-battery',
          name: '主电池',
          percentage: status.bms.soc,
          voltage: status.bms.voltage,
          temperature: status.bms.temperature || 25, // 默认温度
          status: getFaultLevelText(status.bms.faultLevel),
          isCharging: status.bms.current < 0,
          current: status.bms.current,
          power: status.bms.voltage * status.bms.current,
          cycleCount: 0, // PMS 数据中暂无此信息
          cellVoltageDifference: 0, // PMS 数据中暂无此信息
          temperatureDifference: 0, // PMS 数据中暂无此信息
          isFresh: !isStale
        };
        
        setMainBatteryData(batteryInfo);
      }
      
      if (isPmsDataReady()) {
        setIsLoadingMain(false);
      }
    };

    // 转换后端数据为 backup battery 格式
    const convertBackupBatteryData = () => {
      const { data, isStale } = getBatteryData();
      
      if (data) {
        const batteryInfo: BatteryData = {
          id: 'backup-battery',
          name: '备用电池',
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
    convertMainBatteryData();
    convertBackupBatteryData();
    fetchInverterStatus();

    // 订阅数据变化
    const unsubscribePms = subscribeToPmsDataChanges(() => {
      convertMainBatteryData();
    });

    const unsubscribeBattery = subscribeToBatteryDataChanges(() => {
      convertBackupBatteryData();
    });

    // 每2秒更新逆变器状态
    const interval = setInterval(fetchInverterStatus, 2000);

    // 水箱传感器数据更新
    const updateWaterTankData = () => {
      const tankData = getAllWaterTankData();
      setWaterTankData(tankData);
    };

    // 启动传感器数据更新
    levelSensorManager.startPeriodicUpdate(5000);
    blackWaterSensorManager.startPeriodicUpdate(5000);

    // 监听传感器数据变化
    const unsubscribeFreshWater = levelSensorManager.addListener(updateWaterTankData);
    const unsubscribeBlackWater = blackWaterSensorManager.addListener(updateWaterTankData);

    // 初始更新
    updateWaterTankData();

    return () => {
      unsubscribePms();
      unsubscribeBattery();
      clearInterval(interval);
      levelSensorManager.stopPeriodicUpdate();
      blackWaterSensorManager.stopPeriodicUpdate();
      levelSensorManager.removeListener(updateWaterTankData);
      blackWaterSensorManager.removeListener(updateWaterTankData);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 逆变器控制面板 - 替换原 WeatherCard 位置 */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg p-6 border border-blue-200 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">逆变器控制</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-red-800 text-xs">{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* 逆变器控制 */}
          <div className="space-y-4">
            {inverterStatus ? (
              <>
                <InverterControl
                  title="主供电逆变器"
                  status={inverterStatus.mainPower}
                  loading={loading.mainPower}
                  onToggle={handleMainPowerToggle}
                />
                <InverterControl
                  title="备用电池充电逆变器"
                  status={inverterStatus.backupBattery}
                  loading={loading.backupBattery}
                  onToggle={handleBackupBatteryToggle}
                />
              </>
            ) : (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/80 rounded-lg p-4 shadow-md animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-3 bg-gray-200 rounded w-8"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="mt-2 h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-600">
              状态监控中
            </div>
          </div>
        </div>
      </div>
      
      {/* 右侧面板 - 水箱和电池状态 */}
      <div className="lg:col-span-3">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6 border border-blue-100 h-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">水箱状态</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {waterTankData.length > 0 ? (
                  waterTankData.map(tank => (
                    <WaterTankIndicator key={tank.id} tank={tank} />
                  ))
                ) : (
                  // 加载状态
                  [1, 2].map((i) => (
                    <div key={i} className="bg-white/70 rounded-lg p-4 shadow-md animate-pulse">
                      <div className="text-center mb-3">
                        <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                      </div>
                      <div className="h-24 bg-gray-200 rounded mb-3"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                        <div className="h-2 bg-gray-200 rounded w-14 mx-auto"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">电池状态</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* Main Battery - 使用 PMS 真实数据 */}
                {isLoadingMain ? (
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
                ) : mainBatteryData ? (
                  <BatteryIndicator battery={mainBatteryData} />
                ) : (
                  <div className="bg-white/70 rounded-lg p-4 shadow-md">
                    <div className="text-center text-gray-500">
                      <h4 className="text-sm font-semibold mb-2">Main Battery</h4>
                      <p className="text-xs">暂无数据</p>
                    </div>
                  </div>
                )}
                
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