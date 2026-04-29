import React, { useState, useEffect } from 'react';
import { Thermometer, Power, Settings, Activity, AlertTriangle, Wifi, WifiOff, Droplets, Wind, Flame, Sliders, Check, RefreshCw } from 'lucide-react';
import {
  dieselHeaterManager,
  DetailedStatus,
  ThermostatState,
  ReplenishState,
  addDieselHeaterListener,
  removeDieselHeaterListener,
  startHeaterWithHeating,
//   startHeaterWithoutHeating,
  stopHeater,
//   toggleHeating,
  connectHeaterPort,
  disconnectHeaterPort,
  setTargetTemperature,
  setThermostatLowRatio,
  setReplenishCycleEnabled,
} from '../services/dieselHeaterApi';

// 温控状态 → 用户可见的运行态（用于按钮禁用/状态显示）
const thermostatLabel: Record<ThermostatState, { text: string; color: string }> = {
  idle:     { text: '已停止',         color: 'text-gray-600' },
  starting: { text: '启动中（自检）', color: 'text-orange-600' },
  running:  { text: '加热中',         color: 'text-green-600' },
  stopping: { text: '停机中',         color: 'text-orange-600' },
  paused:   { text: '温控暂停',       color: 'text-blue-600' },
};

const replenishLabel: Record<ReplenishState, { text: string; tone: string }> = {
  disabled:     { text: '未运行',   tone: 'gray' },
  replenishing: { text: '补水中',   tone: 'blue' },
  dry:          { text: '干运行',   tone: 'amber' },
};

const formatMSS = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  // 1Hz tick，用于驱动补水循环倒计时刷新（不依赖 status 推送频率）
  const [now, setNow] = useState<number>(Date.now());

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
    
    // 倒计时驱动 - 每秒触发一次重渲染
    const tickId = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      removeDieselHeaterListener(statusListener);
      dieselHeaterManager.stopPeriodicUpdate();
      clearInterval(tickId);
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

  // 补水循环派生量
  const replenishCycleEnabled =
    status?.controlState?.replenishCycleEnabled ?? true;
  const replenishState: ReplenishState =
    status?.controlState?.replenishState ?? 'disabled';
  const replenishStartedAt = status?.controlState?.replenishStateStartedAt ?? 0;
  const replenishDuration = status?.controlState?.replenishStateDurationMs ?? 0;
  const replenishElapsed =
    replenishStartedAt > 0 ? Math.max(0, now - replenishStartedAt) : 0;
  const replenishRemaining = Math.max(0, replenishDuration - replenishElapsed);
  const replenishProgress =
    replenishDuration > 0
      ? Math.min(100, (replenishElapsed / replenishDuration) * 100)
      : 0;
  const replenishCfg = status?.controlState?.replenishConfig;

  const handleToggleReplenishCycle = async () => {
    await handleOperation(
      () => setReplenishCycleEnabled(!replenishCycleEnabled),
      '切换补水循环开关',
    );
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

        {/* 补水循环卡片 */}
        <div
          className={`mb-6 p-5 rounded-xl border-2 transition-colors ${
            !replenishCycleEnabled
              ? 'bg-gray-50 border-gray-200'
              : replenishState === 'replenishing'
              ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300'
              : replenishState === 'dry'
              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center">
                <RefreshCw className={`w-5 h-5 mr-2 ${
                  replenishState === 'replenishing'
                    ? 'text-blue-500 animate-spin'
                    : replenishState === 'dry'
                    ? 'text-amber-500'
                    : 'text-gray-400'
                }`} />
                补水循环
                <span
                  className={`ml-3 px-2 py-0.5 text-xs rounded-full font-medium ${
                    !replenishCycleEnabled
                      ? 'bg-gray-200 text-gray-600'
                      : replenishState === 'replenishing'
                      ? 'bg-blue-500 text-white'
                      : replenishState === 'dry'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {!replenishCycleEnabled ? '已禁用' : replenishLabel[replenishState].text}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                定时接通发动机大循环阀门给加热器补水。接通时温度会瞬间下降（实测 90→50°C / 10s），属正常现象。
              </p>
            </div>
            {/* 开关 */}
            <button
              onClick={handleToggleReplenishCycle}
              disabled={isLoading}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                replenishCycleEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              aria-label="切换补水循环"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  replenishCycleEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 倒计时 + 进度条（仅在循环活动中显示） */}
          {replenishCycleEnabled && replenishState !== 'disabled' && (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-sm text-gray-600">
                  {replenishState === 'replenishing'
                    ? '补水中，剩余时间：'
                    : '下次补水还有：'}
                </div>
                <div className="font-mono text-2xl font-bold text-gray-800 tabular-nums">
                  {formatMSS(replenishRemaining)}
                </div>
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    replenishState === 'replenishing'
                      ? 'bg-blue-500'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${replenishProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>已经过 {formatMSS(replenishElapsed)}</span>
                <span>
                  本阶段共 {formatMSS(replenishDuration)}
                </span>
              </div>
            </>
          )}

          {/* 未启用 / disabled 状态时的提示 */}
          {(!replenishCycleEnabled || replenishState === 'disabled') && (
            <div className="text-xs text-gray-500 bg-white/60 p-3 rounded">
              {!replenishCycleEnabled
                ? '补水循环已关闭。需要时请手动控制"接入发动机冷却液"开关，或重新打开此功能。'
                : '加热器未启动 / 已停止，循环不在运行。下次启动加热器时会自动从补水开始。'}
            </div>
          )}

          {/* 配置参数（小字注脚） */}
          {replenishCfg && (
            <div className="text-[11px] text-gray-400 mt-2">
              参数：补水 {Math.round(replenishCfg.replenishDurationMs / 1000)}s · 干运行 {Math.round(replenishCfg.dryDurationMs / 60000)}分钟
            </div>
          )}
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
