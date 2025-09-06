import React, { useState, useEffect } from 'react';
import { Thermometer, Power, Settings, Activity, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { 
  dieselHeaterManager, 
  DetailedStatus, 
  addDieselHeaterListener, 
  removeDieselHeaterListener,
  startHeaterWithHeating,
//   startHeaterWithoutHeating,
  stopHeater,
//   toggleHeating,
  connectHeaterPort,
  disconnectHeaterPort,
  setTargetTemperature
} from '../services/dieselHeaterApi';

const DieselHeaterPage: React.FC = () => {
  const [status, setStatus] = useState<DetailedStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetTemp, setTargetTemp] = useState<number>(22);
  const [tempInputValue, setTempInputValue] = useState<string>('22');

  useEffect(() => {
    // 启动定时更新
    dieselHeaterManager.startPeriodicUpdate(2000);
    
    // 添加状态监听器
    const statusListener = (newStatus: DetailedStatus | null) => {
      setStatus(newStatus);
    };
    
    addDieselHeaterListener(statusListener);
    
    // 立即获取一次状态
    dieselHeaterManager.fetchDetailedStatus();
    
    return () => {
      removeDieselHeaterListener(statusListener);
      dieselHeaterManager.stopPeriodicUpdate();
    };
  }, []);

  const handleOperation = async (operation: () => Promise<any>, operationName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      if (!result || !result.success) {
        throw new Error(result?.message || `${operationName}失败`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${operationName}失败`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (isOnline: boolean, isConnected: boolean) => {
    if (!isConnected) return 'text-gray-500';
    if (!isOnline) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusIcon = (isOnline: boolean, isConnected: boolean) => {
    if (!isConnected || !isOnline) return <WifiOff className="w-5 h-5" />;
    return <Wifi className="w-5 h-5" />;
  };

  const handleSetTemperature = async () => {
    const temperature = parseInt(tempInputValue);
    if (isNaN(temperature) || temperature < 0 || temperature > 100) {
      setError('温度范围应在 0-100°C 之间');
      return;
    }
    
    await handleOperation(() => setTargetTemperature(temperature), '设置目标温度');
    setTargetTemp(temperature);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Thermometer className="w-8 h-8 mr-3 text-blue-600" />
            柴油加热器控制台
          </h1>
          <div className={`flex items-center space-x-2 ${getStatusColor(status?.online || false, status?.connectionStatus || false)}`}>
            {getStatusIcon(status?.online || false, status?.connectionStatus || false)}
            <span className="font-medium">
              {status?.connectionStatus ? (status?.online ? '在线' : '离线') : '未连接'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 连接控制区域 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            连接控制
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={() => handleOperation(connectHeaterPort, '连接设备')}
              disabled={isLoading || status?.connectionStatus}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              连接设备
            </button>
            <button
              onClick={() => handleOperation(disconnectHeaterPort, '断开连接')}
              disabled={isLoading || !status?.connectionStatus}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              断开连接
            </button>
          </div>
        </div>

        {/* 温度设置区域 */}
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Thermometer className="w-5 h-5 mr-2" />
            温度设置
          </h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">目标温度:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={tempInputValue}
              onChange={(e) => setTempInputValue(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">°C (范围: 0-100°C)</span>
            <button
              onClick={handleSetTemperature}
              disabled={isLoading || !status?.connectionStatus}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              设置温度
            </button>
          </div>
        </div>

        {/* 状态信息展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* 温度信息 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <Thermometer className="w-5 h-5 mr-2" />
              温度信息
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">进水温度:</span>
                <span className="font-medium">{status?.inletTemperature || '--'}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">出水温度:</span>
                <span className="font-medium">{status?.outletTemperature || '--'}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">目标温度:</span>
                <span className="font-medium">{status?.targetTemperature || '--'}°C</span>
              </div>
            </div>
          </div>

          {/* 运行状态 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              运行状态
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">运行状态:</span>
                <span className={`font-medium ${status?.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {status?.isRunning ? '运行中' : '已停止'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">加热状态:</span>
                <span className={`font-medium ${status?.isHeating ? 'text-orange-600' : 'text-gray-600'}`}>
                  {status?.isHeating ? '加热中' : '未加热'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">工作模式:</span>
                <span className="font-medium text-sm">{status?.workModeText || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">点火状态:</span>
                <span className="font-medium text-sm">{status?.ignitionStatusText || '--'}</span>
              </div>
            </div>
          </div>

          {/* 系统信息 */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
              <Power className="w-5 h-5 mr-2" />
              系统信息
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">电压:</span>
                <span className="font-medium">{status?.voltage || '--'}V</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">故障代码:</span>
                <span className={`font-medium ${status?.faultCode ? 'text-red-600' : 'text-green-600'}`}>
                  {status?.faultCode || '正常'}
                </span>
              </div>
              {status?.faultText && (
                <div className="mt-2">
                  <span className="text-gray-600 text-sm">故障描述:</span>
                  <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 rounded">
                    {status.faultText}
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">最后更新:</span>
                <span className="font-medium text-sm">
                  {status?.lastUpdateTime ? new Date(status.lastUpdateTime).toLocaleTimeString() : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作控制区域 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            操作控制
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleOperation(startHeaterWithHeating, '启动并加热')}
              disabled={isLoading || !status?.connectionStatus || status?.isRunning}
              className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center"
            >
              <Power className="w-5 h-5 mb-1" />
              <span className="text-sm">启动并加热</span>
            </button>

            {/* <button
              onClick={() => handleOperation(startHeaterWithoutHeating, '仅启动')}
              disabled={isLoading || !status?.connectionStatus || status?.isRunning}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center"
            >
              <Activity className="w-5 h-5 mb-1" />
              <span className="text-sm">仅启动</span>
            </button>

            <button
              onClick={() => handleOperation(toggleHeating, '切换加热')}
              disabled={isLoading || !status?.connectionStatus || !status?.isRunning}
              className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center"
            >
              <Thermometer className="w-5 h-5 mb-1" />
              <span className="text-sm">切换加热</span>
            </button> */}

            <button
              onClick={() => handleOperation(stopHeater, '停止设备')}
              disabled={isLoading || !status?.connectionStatus || !status?.isRunning}
              className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center"
            >
              <Power className="w-5 h-5 mb-1" />
              <span className="text-sm">停止设备</span>
            </button>
          </div>
        </div>

        {/* 控制状态信息 */}
        {status?.controlState && (
          <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">控制状态详情</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">开机状态:</span>
                <span className={`font-medium ${status.controlState.on ? 'text-green-600' : 'text-red-600'}`}>
                  {status.controlState.on ? '开启' : '关闭'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">加热状态:</span>
                <span className={`font-medium ${status.controlState.heating ? 'text-orange-600' : 'text-gray-600'}`}>
                  {status.controlState.heating ? '加热中' : '未加热'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">有效控制:</span>
                <span className={`font-medium ${status.controlState.hasActiveControl ? 'text-green-600' : 'text-red-600'}`}>
                  {status.controlState.hasActiveControl ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">控制目标温度:</span>
                <span className="font-medium">{status.controlState.targetTemperature}°C</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DieselHeaterPage;
