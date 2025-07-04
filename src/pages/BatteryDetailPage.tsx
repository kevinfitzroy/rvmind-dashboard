import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Battery, Zap, Thermometer, Gauge, Settings, Activity, Clock } from 'lucide-react';
import { getBatteryDetailedData, BatteryDetailedData } from '../services/api';

const BatteryDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [batteryData, setBatteryData] = useState<BatteryDetailedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getBatteryDetailedData();
        setBatteryData(data);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        setError('获取电池数据失败');
        console.error('Error fetching battery data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // 5秒刷新一次

    return () => clearInterval(interval);
  }, []);

  const getChargeDischargeStatusText = (status: number) => {
    switch (status) {
      case 0: return '静止';
      case 1: return '充电';
      case 2: return '放电';
      default: return '未知';
    }
  };

  const getBalancingStatusText = (status: number) => {
    switch (status) {
      case 0: return '关闭';
      case 1: return '被动均衡';
      case 2: return '主动均衡';
      default: return '未知';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (isLoading && !batteryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-md">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">加载失败</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft size={20} />
              返回
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Backup Battery 详情</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} />
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </div>
        </div>

        {batteryData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SOC 信息 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Battery className="text-green-600" size={24} />
                <h3 className="text-lg font-semibold">电量信息</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">SOC:</span>
                  <span className="font-medium">{batteryData.soc.soc}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">剩余容量:</span>
                  <span className="font-medium">{batteryData.soc.remainingCapacity}Ah</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${batteryData.soc.soc}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 电压信息 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold">电压信息</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">总电压:</span>
                  <span className="font-medium">{batteryData.voltage.totalVoltage.toFixed(2)}V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平均电压:</span>
                  <span className="font-medium">{batteryData.voltage.averageVoltage.toFixed(3)}V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最高单体:</span>
                  <span className="font-medium">{batteryData.voltage.maxCellVoltage.toFixed(3)}V (#{batteryData.voltage.maxCellVoltageIndex})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最低单体:</span>
                  <span className="font-medium">{batteryData.voltage.minCellVoltage.toFixed(3)}V (#{batteryData.voltage.minCellVoltageIndex})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">压差:</span>
                  <span className="font-medium text-orange-600">{batteryData.voltage.cellVoltageDifference.toFixed(3)}V</span>
                </div>
              </div>
            </div>

            {/* 电流信息 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-purple-600" size={24} />
                <h3 className="text-lg font-semibold">电流信息</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">电流:</span>
                  <span className="font-medium">{batteryData.current.current.toFixed(2)}A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">充放电状态:</span>
                  <span className="font-medium">{getChargeDischargeStatusText(batteryData.current.chargeDischargeStatus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">充电器:</span>
                  <span className="font-medium">{batteryData.current.chargerStatus ? '已连接' : '未连接'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">负载:</span>
                  <span className="font-medium">{batteryData.current.loadStatus ? '有负载' : '无负载'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">加热电流:</span>
                  <span className="font-medium">{batteryData.current.heatingCurrent}A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">限流状态:</span>
                  <span className="font-medium">{batteryData.current.currentLimitingStatus ? '限流中' : '正常'}</span>
                </div>
              </div>
            </div>

            {/* 功率信息 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Gauge className="text-red-600" size={24} />
                <h3 className="text-lg font-semibold">功率信息</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">功率:</span>
                  <span className="font-medium">{batteryData.power.power.toFixed(2)}W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">能量:</span>
                  <span className="font-medium">{batteryData.power.energy}Wh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">电压:</span>
                  <span className="font-medium">{batteryData.power.voltage.toFixed(2)}V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">电流:</span>
                  <span className="font-medium">{batteryData.power.current.toFixed(2)}A</span>
                </div>
              </div>
            </div>

            {/* 温度信息 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Thermometer className="text-red-500" size={24} />
                <h3 className="text-lg font-semibold">温度信息</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">最高温度:</span>
                  <span className="font-medium">{batteryData.temperature.maxCellTemperature}°C (#{batteryData.temperature.maxCellTemperatureIndex})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最低温度:</span>
                  <span className="font-medium">{batteryData.temperature.minCellTemperature}°C (#{batteryData.temperature.minCellTemperatureIndex})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">温差:</span>
                  <span className="font-medium text-orange-600">{batteryData.temperature.temperatureDifference}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MOS温度:</span>
                  <span className="font-medium">{batteryData.temperature.mosTemperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">环境温度:</span>
                  <span className="font-medium">{batteryData.temperature.ambientTemperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">加热温度:</span>
                  <span className="font-medium">{batteryData.temperature.heatingTemperature}°C</span>
                </div>
              </div>
            </div>

            {/* 系统状态 */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="text-gray-600" size={24} />
                <h3 className="text-lg font-semibold">系统状态</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">充放电状态:</span>
                  <span className="font-medium">{getChargeDischargeStatusText(batteryData.status.chargeDischargeStatus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">均衡状态:</span>
                  <span className="font-medium">{getBalancingStatusText(batteryData.status.balancingStatus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">充电MOS:</span>
                  <span className="font-medium">{batteryData.status.chargeMosStatus ? '开启' : '关闭'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">放电MOS:</span>
                  <span className="font-medium">{batteryData.status.dischargeMosStatus ? '开启' : '关闭'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">预充MOS:</span>
                  <span className="font-medium">{batteryData.status.prechargeMosStatus ? '开启' : '关闭'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">加热MOS:</span>
                  <span className="font-medium">{batteryData.status.heaterMosStatus ? '开启' : '关闭'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">风扇MOS:</span>
                  <span className="font-medium">{batteryData.status.fanMosStatus ? '开启' : '关闭'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">循环次数:</span>
                  <span className="font-medium">{batteryData.status.cycleCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatteryDetailPage;
