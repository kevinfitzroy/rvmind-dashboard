import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModbusPortStatus {
  port: string;
  queueLength: number;
  isProcessing: boolean;
  lastRequestTime: number;
  timeSinceLastRequest: number;
  errorCount24h: number;
  errorCount1m: number;
  lastError?: {
    timestamp: number;
    error: string;
  };
  accessCount1m: number;
  lastAccess?: {
    timestamp: number;
    deviceAddress: number;
  };
}

interface ModbusStatus {
  queues: ModbusPortStatus[];
  totalQueuedRequests: number;
  activeProcessingPorts: number;
  totalErrors24h: number;
  totalErrors1m: number;
  totalAccesses1m: number;
}

const CommunicationStatus: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ModbusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://192.168.8.145:3000/modbus/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // 每2秒更新一次
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPortStatusColor = (port: ModbusPortStatus) => {
    if (port.errorCount1m > 0) return 'text-red-600 bg-red-50';
    if (port.isProcessing) return 'text-blue-600 bg-blue-50';
    if (port.accessCount1m > 0) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPortStatusIcon = (port: ModbusPortStatus) => {
    if (port.errorCount1m > 0) return <AlertTriangle className="w-5 h-5" />;
    if (port.isProcessing) return <Activity className="w-5 h-5 animate-pulse" />;
    if (port.accessCount1m > 0) return <CheckCircle className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">通信状态监控</h1>
          </div>
          <div className="text-sm text-gray-500">
            最后更新: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {status && (
          <>
            {/* 总览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">队列请求总数</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.totalQueuedRequests}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">活跃端口</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.activeProcessingPorts}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">1分钟错误数</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.totalErrors1m}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">1分钟访问数</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.totalAccesses1m}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 端口状态列表 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Modbus 端口状态</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {status.queues.map((port, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getPortStatusColor(port)}`}>
                          {getPortStatusIcon(port)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{port.port}</h3>
                          <p className="text-sm text-gray-500">
                            {port.isProcessing ? '处理中' : port.accessCount1m > 0 ? '正常' : '空闲'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">队列长度</p>
                        <p className="text-xl font-semibold text-gray-900">{port.queueLength}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">1分钟访问</p>
                        <p className="font-semibold">{port.accessCount1m}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">1分钟错误</p>
                        <p className="font-semibold text-red-600">{port.errorCount1m}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">24小时错误</p>
                        <p className="font-semibold text-red-600">{port.errorCount24h}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">最后请求</p>
                        <p className="font-semibold">
                          {port.lastRequestTime ? formatTime(port.lastRequestTime) : '无'}
                        </p>
                      </div>
                    </div>
                    
                    {port.lastError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          最后错误: {port.lastError.error} 
                          <span className="ml-2 text-red-600">
                            ({formatTime(port.lastError.timestamp)})
                          </span>
                        </p>
                      </div>
                    )}
                    
                    {port.lastAccess && (
                      <div className="mt-2 text-sm text-gray-600">
                        最后访问设备: {port.lastAccess.deviceAddress} 
                        <span className="ml-2">
                          ({formatTime(port.lastAccess.timestamp)})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunicationStatus;
