import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Power,
  Settings,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  FlaskConical,
  Send,
} from 'lucide-react';
import {
  dieselHeaterManager,
  DetailedStatus,
  ReplenishState,
  addDieselHeaterListener,
  removeDieselHeaterListener,
  startHeaterWithHeating,
  stopHeater,
  connectHeaterPort,
  disconnectHeaterPort,
  setTargetTemperature,
  setReplenishCycleEnabled,
  sendOneshotFrame,
  setDefaultControlEnabled,
  setManualFrame,
} from '../services/dieselHeaterApi';

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

const DieselHeaterPage: React.FC = () => {
  const [status, setStatus] = useState<DetailedStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempInputValue, setTempInputValue] = useState<string>('90');
  // 1Hz tick，用于驱动补水循环倒计时刷新（不依赖 status 推送频率）
  const [now, setNow] = useState<number>(Date.now());
  // 手动测试帧的发送计数和最近时间，用于观察行为
  const [oneshotStats, setOneshotStats] = useState<{
    counts: { onHeat: number; onNoHeat: number; off: number };
    lastSent: { type: string; ts: number } | null;
  }>({
    counts: { onHeat: 0, onNoHeat: 0, off: 0 },
    lastSent: null,
  });

  useEffect(() => {
    dieselHeaterManager.startPeriodicUpdate(2000);
    const statusListener = (newStatus: DetailedStatus | null) => {
      setStatus(newStatus);
    };
    addDieselHeaterListener(statusListener);
    dieselHeaterManager.fetchDetailedStatus();
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

  const handleSetTemperature = async () => {
    const temperature = parseInt(tempInputValue);
    if (isNaN(temperature) || temperature < 0 || temperature > 100) {
      setError('温度范围应在 0-100°C 之间');
      return;
    }
    await handleOperation(() => setTargetTemperature(temperature), '设置目标温度');
  };

  // 启停按钮 disabled 直接基于设备硬件 isRunning（温控状态机已移除）
  const isRunning = status?.isRunning ?? false;
  const startDisabled = isLoading || !status?.connectionStatus || isRunning;
  const stopDisabled = isLoading || !status?.connectionStatus || !isRunning;

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

  // 手动发一帧测试帧
  const handleSendOneshot = async (type: 'onHeat' | 'onNoHeat' | 'off') => {
    const params = {
      onHeat: { on: true, heating: true, label: '开机+加热' },
      onNoHeat: { on: true, heating: false, label: '开机+不加热' },
      off: { on: false, heating: false, label: '关机' },
    }[type];
    try {
      const r = await sendOneshotFrame(params.on, params.heating);
      if (!r || !r.success) {
        throw new Error(r?.message || '发帧失败');
      }
      setOneshotStats((prev) => ({
        counts: { ...prev.counts, [type]: prev.counts[type] + 1 },
        lastSent: { type: params.label, ts: Date.now() },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '发帧失败');
    }
  };

  const handleToggleDefaultControl = async () => {
    const next = !(status?.controlState?.defaultControlEnabled ?? true);
    await handleOperation(
      () => setDefaultControlEnabled(next),
      '切换默认控制帧',
    );
  };

  const handleToggleManualFrame = async (type: 'heating' | 'noHeating') => {
    const isActive = status?.controlState?.manualFrameType === type;
    await handleOperation(
      () => setManualFrame(type, !isActive),
      `切换手动${type === 'heating' ? '加热' : '不加热'}帧`,
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Thermometer className="w-8 h-8 mr-3 text-blue-600" />
            柴油加热器低层控制台
          </h1>
          <div className={`flex items-center space-x-2 ${getStatusColor(status?.online || false, status?.connectionStatus || false)}`}>
            {getStatusIcon(status?.online || false, status?.connectionStatus || false)}
            <span className="font-medium">
              {status?.connectionStatus ? (status?.online ? '在线' : '离线') : '未连接'}
            </span>
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          <strong>低层调试页面</strong>：日常使用请走 <code className="bg-white px-1 rounded">/thermal-center</code>。
          这里不再做温控决策，设备依靠自身的 85°C 节流和 90°C 高温保护工作。
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

        {/* 目标温度设置 */}
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Thermometer className="w-5 h-5 mr-2 text-orange-600" />
            目标温度（写入 byte2）
          </h2>
          <p className="text-xs text-gray-600 mb-3">
            该值仅写入控制帧 byte2 上报给设备。实测设备不响应此参数（硬件硬编码 85°C 节流），仅作显示一致用。
          </p>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">目标:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={tempInputValue}
              onChange={(e) => setTempInputValue(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">
              °C · 当前设备:{' '}
              <span className="font-medium text-gray-800">
                {status?.targetTemperature ?? '--'}°C
              </span>
            </span>
            <button
              onClick={handleSetTemperature}
              disabled={isLoading || !status?.connectionStatus}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              应用
            </button>
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
                定时接通发动机大循环阀门给加热器补水。新启动逻辑下默认关闭（阀由启动逻辑常开管理）。
              </p>
            </div>
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
                <span>本阶段共 {formatMSS(replenishDuration)}</span>
              </div>
            </>
          )}

          {(!replenishCycleEnabled || replenishState === 'disabled') && (
            <div className="text-xs text-gray-500 bg-white/60 p-3 rounded">
              {!replenishCycleEnabled
                ? '补水循环已关闭。新启动逻辑会持续接通阀门，不需要循环。如需调试可临时开启。'
                : '加热器未启动 / 已停止，循环不在运行。'}
            </div>
          )}

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
                <span className="text-gray-600">设备运行:</span>
                <span className={`font-medium ${isRunning ? 'text-green-600' : 'text-gray-600'}`}>
                  {isRunning ? '运行中' : '已停止'}
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
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleOperation(startHeaterWithHeating, '启动并加热')}
              disabled={startDisabled}
              className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center"
            >
              <Power className="w-5 h-5 mb-1" />
              <span className="text-sm">启动并加热</span>
            </button>
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
                <span className="text-gray-600">控制目标温度:</span>
                <span className="font-medium">{status.controlState.targetTemperature}°C</span>
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
                <span className="text-gray-600">默认帧循环:</span>
                <span className={`font-medium ${status.controlState.hasActiveControl ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.controlState.hasActiveControl ? '运行' : '未运行'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 调试 / 实验区：1Hz 循环切换 */}
        {(() => {
          const defaultOn = status?.controlState?.defaultControlEnabled ?? true;
          const manualType = status?.controlState?.manualFrameType ?? null;
          const heatingOn = manualType === 'heating';
          const noHeatingOn = manualType === 'noHeating';
          return (
            <div className="mt-6 p-4 bg-slate-900 text-slate-100 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-base font-semibold flex items-center">
                  <FlaskConical className="w-4 h-4 mr-2 text-purple-400" />
                  控制帧调度（调试）
                </h3>
                <span className="text-[11px] text-slate-400">
                  默认帧 currentState:{' '}
                  <code className="text-slate-200">
                    on={status?.controlState?.on ? '1' : '0'}, heat=
                    {status?.controlState?.heating ? '1' : '0'}
                  </code>
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                "默认 1Hz 控制帧"和"手动加热/不加热"互斥地占用控制信道。
                启动加热器（无论从这里还是热控中心）会自动切到"手动加热"+ 关闭默认帧；
                停止加热器会清空所有循环。
              </p>

              <div className="space-y-2 mb-3">
                {/* 默认 */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    defaultOn
                      ? 'bg-emerald-900/40 border-emerald-700'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      默认 1Hz 控制帧
                      {defaultOn && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                          可发帧
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      仅在 timer 启动时才真发帧；启动加热器后默认 timer 不在运行
                    </div>
                  </div>
                  <button
                    onClick={handleToggleDefaultControl}
                    disabled={isLoading || !status?.connectionStatus}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                      defaultOn ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        defaultOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 手动 加热 */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    heatingOn
                      ? 'bg-orange-900/40 border-orange-700'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      手动 1Hz: 开机 + 加热
                      {heatingOn && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-orange-600 text-white rounded animate-pulse">
                          运行中
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <code>on=1, heat=1</code>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleManualFrame('heating')}
                    disabled={isLoading || !status?.connectionStatus}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                      heatingOn ? 'bg-orange-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        heatingOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 手动 不加热 */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    noHeatingOn
                      ? 'bg-blue-900/40 border-blue-700'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      手动 1Hz: 开机 + 不加热
                      {noHeatingOn && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded animate-pulse">
                          运行中
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <code>on=1, heat=0</code> · 对照
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleManualFrame('noHeating')}
                    disabled={isLoading || !status?.connectionStatus}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                      noHeatingOn ? 'bg-blue-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        noHeatingOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 一次性发帧 */}
              <div className="pt-3 border-t border-slate-700">
                <div className="text-[11px] text-slate-400 mb-2">
                  一次性插入（不影响当前循环）
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => handleSendOneshot('onHeat')}
                    disabled={!status?.connectionStatus}
                    className="px-2 py-1.5 bg-orange-600/70 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded flex items-center justify-center gap-1 text-xs"
                  >
                    <Send className="w-3 h-3" />
                    加热 ({oneshotStats.counts.onHeat})
                  </button>
                  <button
                    onClick={() => handleSendOneshot('onNoHeat')}
                    disabled={!status?.connectionStatus}
                    className="px-2 py-1.5 bg-blue-600/70 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded flex items-center justify-center gap-1 text-xs"
                  >
                    <Send className="w-3 h-3" />
                    不加热 ({oneshotStats.counts.onNoHeat})
                  </button>
                  <button
                    onClick={() => handleSendOneshot('off')}
                    disabled={!status?.connectionStatus}
                    className="px-2 py-1.5 bg-red-600/70 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded flex items-center justify-center gap-1 text-xs"
                  >
                    <Send className="w-3 h-3" />
                    关机 ({oneshotStats.counts.off})
                  </button>
                </div>
                {oneshotStats.lastSent && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    最近: {oneshotStats.lastSent.type} ·{' '}
                    {Math.round((now - oneshotStats.lastSent.ts) / 1000)}s 前
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700 text-[11px] text-slate-400">
                观察字段：点火(
                <code className="text-slate-200">{status?.ignitionStatusText || '--'}</code>
                ) · 工作模式(
                <code className="text-slate-200">{status?.workModeText || '--'}</code>
                ) · 出水({status?.outletTemperature ?? '--'}°C)
                <br />
                日志：<code className="text-slate-200">tail -f logs/dieselHeater-trace.log</code>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DieselHeaterPage;
