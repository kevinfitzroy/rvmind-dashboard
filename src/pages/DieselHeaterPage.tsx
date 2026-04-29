import React, { useState, useEffect } from 'react';
import { Thermometer, Power, Settings, Activity, AlertTriangle, Wifi, WifiOff, Droplets, Wind, Flame, Sliders, Check } from 'lucide-react';
import {
  dieselHeaterManager,
  DetailedStatus,
  ThermostatState,
  addDieselHeaterListener,
  removeDieselHeaterListener,
  startHeaterWithHeating,
//   startHeaterWithoutHeating,
  stopHeater,
//   toggleHeating,
  connectHeaterPort,
  disconnectHeaterPort,
  setTargetTemperature,
  setThermostatLowRatio
} from '../services/dieselHeaterApi';

// 温控状态 → 用户可见的运行态（用于按钮禁用/状态显示）
const thermostatLabel: Record<ThermostatState, { text: string; color: string }> = {
  idle:     { text: '已停止',         color: 'text-gray-600' },
  starting: { text: '启动中（自检）', color: 'text-orange-600' },
  running:  { text: '加热中',         color: 'text-green-600' },
  stopping: { text: '停机中',         color: 'text-orange-600' },
  paused:   { text: '温控暂停',       color: 'text-blue-600' },
};

// 预设温度模式：一键应用 target + ratio
type Preset = {
  id: string;
  name: string;
  target: number;
  ratio: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  ringClass: string;
  bgClass: string;
  hint: string;
};

const PRESETS: Preset[] = [
  {
    id: 'shower',
    name: '淋浴 / 生活用水',
    target: 60,
    ratio: 0.9,
    icon: Droplets,
    iconClass: 'text-blue-500',
    ringClass: 'border-blue-500 ring-blue-200',
    bgClass: 'bg-blue-50',
    hint: '温度稳定 · 波动小',
  },
  {
    id: 'heat-low',
    name: '暖风 · 低档',
    target: 60,
    ratio: 0.7,
    icon: Wind,
    iconClass: 'text-sky-400',
    ringClass: 'border-sky-400 ring-sky-200',
    bgClass: 'bg-sky-50',
    hint: '低温保暖',
  },
  {
    id: 'heat-mid',
    name: '暖风 · 中档',
    target: 75,
    ratio: 0.7,
    icon: Wind,
    iconClass: 'text-amber-500',
    ringClass: 'border-amber-500 ring-amber-200',
    bgClass: 'bg-amber-50',
    hint: '舒适取暖',
  },
  {
    id: 'heat-high',
    name: '暖风 · 高档',
    target: 90,
    ratio: 0.7,
    icon: Flame,
    iconClass: 'text-red-500',
    ringClass: 'border-red-500 ring-red-200',
    bgClass: 'bg-red-50',
    hint: '快速升温',
  },
];

const matchPreset = (target: number, ratio: number) =>
  PRESETS.find(
    (p) => p.target === target && Math.abs(p.ratio - ratio) < 0.005,
  );

const DieselHeaterPage: React.FC = () => {
  const [status, setStatus] = useState<DetailedStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetTemp, setTargetTemp] = useState<number>(22);
  const [tempInputValue, setTempInputValue] = useState<string>('22');
  // 重启阈值占目标温度的百分比，默认 60%
  const [ratioInputValue, setRatioInputValue] = useState<string>('60');

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

  // 一键应用：一次同时设置 target 和 ratio（串行调用以保持错误清晰）
  const applyTargetAndRatio = async (target: number, ratio: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const r1 = await setTargetTemperature(target);
      if (!r1 || !r1.success) {
        throw new Error(r1?.message || '设置目标温度失败');
      }
      const r2 = await setThermostatLowRatio(ratio);
      if (!r2 || !r2.success) {
        throw new Error(r2?.message || '设置重启阈值失败');
      }
      setTargetTemp(target);
      setTempInputValue(String(target));
      setRatioInputValue(String(Math.round(ratio * 100)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (preset: Preset) => applyTargetAndRatio(preset.target, preset.ratio);

  const handleApplyCustom = async () => {
    const temperature = parseInt(tempInputValue);
    const percent = parseFloat(ratioInputValue);
    if (isNaN(temperature) || temperature < 0 || temperature > 100) {
      setError('温度范围应在 0-100°C 之间');
      return;
    }
    if (isNaN(percent) || percent < 10 || percent > 99) {
      setError('重启阈值百分比应在 10-99 之间');
      return;
    }
    await applyTargetAndRatio(temperature, percent / 100);
  };

  // 用 thermostatState 而非 isRunning 来决定按钮启停 - 温控暂停期间设备 workStatus=0
  // 但温控仍在管理，此时"启动"应禁用、"停止"应允许
  const thermostatState: ThermostatState = status?.controlState?.thermostatState ?? 'idle';
  const thermostatActive = thermostatState !== 'idle';
  const startDisabled = isLoading || !status?.connectionStatus || thermostatActive;
  const stopDisabled = isLoading || !status?.connectionStatus || (!thermostatActive && !status?.isRunning);
  const operationalLabel = thermostatLabel[thermostatState];

  // 当前后端配置匹配到的预设（找不到则为自定义）
  const currentTarget = status?.controlState?.targetTemperature;
  const currentRatio = status?.controlState?.thermostatLowRatio;
  const activePreset =
    currentTarget !== undefined && currentRatio !== undefined
      ? matchPreset(currentTarget, currentRatio)
      : undefined;

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

        {/* 温度模式区域 */}
        <div className="mb-6 p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 rounded-xl border border-orange-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Thermometer className="w-5 h-5 mr-2 text-orange-600" />
              温度模式
            </h2>
            {status?.controlState && (
              <div className="text-sm text-gray-600 flex items-center">
                <span className="hidden sm:inline mr-2">当前:</span>
                <span className="font-medium text-gray-800">
                  {currentTarget}°C
                </span>
                <span className="mx-1.5 text-gray-400">·</span>
                <span className="font-medium text-gray-800">
                  阈值 {((currentRatio ?? 0) * 100).toFixed(0)}% (
                  {status.controlState.thermostatLowThreshold.toFixed(1)}°C)
                </span>
                {!activePreset && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                    自定义
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 预设场景卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isActive = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  disabled={isLoading || !status?.connectionStatus}
                  className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      isActive
                        ? `${preset.ringClass} ${preset.bgClass} ring-4 shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <Icon className={`w-9 h-9 mb-2 ${preset.iconClass}`} />
                  <div className="font-medium text-sm text-gray-800 leading-tight">
                    {preset.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {preset.target}°C · 阈值 {Math.round(preset.ratio * 100)}%
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {preset.hint}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 自定义编辑区 */}
          <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Sliders className="w-4 h-4 mr-1.5 text-gray-500" />
              自定义
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  目标温度 (°C)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempInputValue}
                  onChange={(e) => setTempInputValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  重启阈值 (% of 目标)
                </label>
                <input
                  type="number"
                  min="10"
                  max="99"
                  step="1"
                  value={ratioInputValue}
                  onChange={(e) => setRatioInputValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleApplyCustom}
                disabled={isLoading || !status?.connectionStatus}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                应用
              </button>
            </div>
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
                <span className="text-gray-600">温控状态:</span>
                <span className={`font-medium ${operationalLabel.color}`}>
                  {operationalLabel.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">设备运行:</span>
                <span className={`font-medium ${status?.isRunning ? 'text-green-600' : 'text-gray-600'}`}>
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
              disabled={startDisabled}
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
              disabled={stopDisabled}
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
                <span className="text-gray-600">温控启用:</span>
                <span className={`font-medium ${status.controlState.thermostatEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.controlState.thermostatEnabled ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">温控阶段:</span>
                <span className={`font-medium ${operationalLabel.color}`}>
                  {operationalLabel.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">控制目标温度:</span>
                <span className="font-medium">{status.controlState.targetTemperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">重启阈值:</span>
                <span className="font-medium">
                  {status.controlState.thermostatLowThreshold?.toFixed(1) ?? '--'}°C
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">当前指令(开机):</span>
                <span className={`font-medium ${status.controlState.on ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.controlState.on ? '开启' : '关闭'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">当前指令(加热):</span>
                <span className={`font-medium ${status.controlState.heating ? 'text-orange-600' : 'text-gray-600'}`}>
                  {status.controlState.heating ? '加热' : '不加热'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">帧循环活跃:</span>
                <span className={`font-medium ${status.controlState.hasActiveControl ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.controlState.hasActiveControl ? '是' : '否'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DieselHeaterPage;
