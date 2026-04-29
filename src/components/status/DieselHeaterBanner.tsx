import React, { useEffect, useState } from 'react';
import { Flame, RefreshCw, AlertTriangle, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  dieselHeaterManager,
  DetailedStatus,
  ThermostatState,
  ReplenishState,
  addDieselHeaterListener,
  removeDieselHeaterListener,
} from '../../services/dieselHeaterApi';

const thermostatStateText: Record<ThermostatState, string> = {
  idle: '已停止',
  starting: '启动中（自检）',
  running: '加热中',
  stopping: '停机中',
  paused: '保温暂停',
};

const replenishStateText: Record<ReplenishState, string> = {
  disabled: '未运行',
  replenishing: '补水中',
  dry: '干运行',
};

const formatMSS = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const DieselHeaterBanner: React.FC = () => {
  const [status, setStatus] = useState<DetailedStatus | null>(
    dieselHeaterManager.getCurrentStatus(),
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // 复用全局 manager（DieselHeaterPage 也用同一份）。manager 内部 startPeriodicUpdate
    // 是幂等的（重复调用会先 stop 再 start），多个订阅共存安全。
    dieselHeaterManager.startPeriodicUpdate(2000);
    const listener = (s: DetailedStatus | null) => setStatus(s);
    addDieselHeaterListener(listener);
    dieselHeaterManager.fetchDetailedStatus();

    const tickId = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      removeDieselHeaterListener(listener);
      dieselHeaterManager.stopPeriodicUpdate();
      clearInterval(tickId);
    };
  }, []);

  // 显示判定：温控活跃 或 设备真实在运行（覆盖 startHeaterWithoutHeating 等绕过温控的路径）
  const thermostatState: ThermostatState =
    status?.controlState?.thermostatState ?? 'idle';
  const shouldShow =
    !!status &&
    status.connectionStatus &&
    (thermostatState !== 'idle' || status.isRunning);

  if (!shouldShow || !status) return null;

  const cs = status.controlState;
  const replenishState: ReplenishState = cs?.replenishState ?? 'disabled';
  const replenishStartedAt = cs?.replenishStateStartedAt ?? 0;
  const replenishDuration = cs?.replenishStateDurationMs ?? 0;
  const replenishElapsed =
    replenishStartedAt > 0 ? Math.max(0, now - replenishStartedAt) : 0;
  const replenishRemaining = Math.max(0, replenishDuration - replenishElapsed);
  const replenishProgress =
    replenishDuration > 0
      ? Math.min(100, (replenishElapsed / replenishDuration) * 100)
      : 0;
  const replenishActive =
    cs?.replenishCycleEnabled && replenishState !== 'disabled';

  const isFault = status.faultCode > 0;

  // 故障态用红色，正常态用橙红渐变
  const bgClass = isFault
    ? 'bg-gradient-to-r from-red-600 to-rose-700'
    : 'bg-gradient-to-r from-orange-500 via-rose-500 to-red-500';

  return (
    <Link to="/diesel-heater" className="block">
      <div
        className={`${bgClass} rounded-xl shadow-md p-4 text-white hover:shadow-lg transition-shadow`}
      >
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* 左：图标 + 状态 */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              {isFault ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Flame
                  className={`w-7 h-7 ${
                    thermostatState === 'running' ? 'animate-pulse' : ''
                  }`}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider opacity-80">
                柴油加热器
              </div>
              <div className="text-lg font-semibold truncate">
                {isFault
                  ? `故障 · ${status.faultText}`
                  : thermostatStateText[thermostatState]}
              </div>
              <div className="text-xs opacity-80 truncate">
                {cs?.thermostatEnabled
                  ? `温控启用 · 阈值 ${Math.round((cs.thermostatLowRatio ?? 0) * 100)}% (${cs.thermostatLowThreshold.toFixed(0)}°C)`
                  : status.isRunning
                    ? '温控未启用 · 设备运行中'
                    : ''}
              </div>
            </div>
          </div>

          {/* 中：温度 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className="text-[11px] opacity-80 flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3" />
                进水
              </div>
              <div className="text-2xl font-bold tabular-nums leading-tight">
                {status.inletTemperature}°
              </div>
            </div>
            <div className="text-xl opacity-60 self-center">→</div>
            <div className="text-center">
              <div className="text-[11px] opacity-80">目标</div>
              <div className="text-2xl font-bold tabular-nums leading-tight">
                {status.targetTemperature}°
              </div>
            </div>
            <div className="text-[11px] opacity-80 ml-2 hidden sm:block">
              出水
              <br />
              <span className="text-base font-semibold tabular-nums">
                {status.outletTemperature}°
              </span>
            </div>
          </div>

          {/* 右：补水循环倒计时（仅在循环活动时显示） */}
          {replenishActive && (
            <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-2 min-w-[150px] flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] opacity-90 mb-0.5">
                <RefreshCw
                  size={12}
                  className={
                    replenishState === 'replenishing' ? 'animate-spin' : ''
                  }
                />
                {replenishStateText[replenishState]}
                <span className="opacity-70">·</span>
                <span className="opacity-70">剩余</span>
              </div>
              <div className="text-xl font-bold tabular-nums leading-tight">
                {formatMSS(replenishRemaining)}
              </div>
              <div className="h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    replenishState === 'replenishing'
                      ? 'bg-white'
                      : 'bg-white/70'
                  }`}
                  style={{ width: `${replenishProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default DieselHeaterBanner;
