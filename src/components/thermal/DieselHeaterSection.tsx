import React, { useEffect, useRef, useState } from 'react';
import {
  Flame,
  Thermometer,
  ThermometerSun,
  AlertCircle,
  CheckCircle2,
  Plug,
  Play,
  Square,
  Droplets,
} from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import RelayRow from './RelayRow';
import {
  dieselHeaterManager,
  DetailedStatus,
} from '../../services/dieselHeaterApi';
import {
  getButtonState,
  subscribeToDeviceStatusChanges,
  turnButtonOff,
  turnButtonOn,
} from '../../services/api';

const POWER_BUTTON_ID = 'diesel_boiler_power';
const COOLANT_BUTTON_ID = 'solenoid_valve_signal_engine';
const TEMP_MIN = 80;
const TEMP_MAX = 90;

type BusyKind = null | 'start' | 'stop' | 'temp' | 'power' | 'coolant';

interface Feedback {
  ok: boolean;
  text: string;
  at: Date;
}

const DieselHeaterSection: React.FC = () => {
  const [status, setStatus] = useState<DetailedStatus | null>(
    dieselHeaterManager.getCurrentStatus(),
  );
  const [busy, setBusy] = useState<BusyKind>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [targetInput, setTargetInput] = useState<number>(85);
  // 用户改过 slider 之后，定时刷新就不再覆盖 targetInput；点"应用"成功后或卸载时重置
  const targetDirtyRef = useRef(false);
  const [powerOn, setPowerOn] = useState<boolean>(
    () => getButtonState(POWER_BUTTON_ID).state,
  );
  const [powerStale, setPowerStale] = useState<boolean>(
    () => getButtonState(POWER_BUTTON_ID).isStale,
  );
  const [coolantOn, setCoolantOn] = useState<boolean>(
    () => getButtonState(COOLANT_BUTTON_ID).state,
  );
  const [coolantStale, setCoolantStale] = useState<boolean>(
    () => getButtonState(COOLANT_BUTTON_ID).isStale,
  );

  // 启动加热器状态轮询并订阅
  useEffect(() => {
    dieselHeaterManager.startPeriodicUpdate(2000);
    const onStatus = (s: DetailedStatus | null) => {
      setStatus(s);
      // 用户正在拖动/已改过尚未应用 → 不要把设备值同步过来覆盖他
      if (targetDirtyRef.current) return;
      if (s?.targetTemperature) {
        setTargetInput((prev) => {
          // 设备值落入 80-90 区间才同步到输入；否则保持上次输入
          if (s.targetTemperature >= TEMP_MIN && s.targetTemperature <= TEMP_MAX) {
            return s.targetTemperature;
          }
          return prev;
        });
      }
    };
    dieselHeaterManager.addListener(onStatus);
    return () => {
      dieselHeaterManager.removeListener(onStatus);
      // 不 stopPeriodicUpdate：其他页面（如 /diesel-heater）可能也在使用这个全局轮询
    };
  }, []);

  // 订阅继电器状态
  useEffect(() => {
    const refreshRelays = () => {
      const power = getButtonState(POWER_BUTTON_ID);
      setPowerOn(power.state);
      setPowerStale(power.isStale);
      const coolant = getButtonState(COOLANT_BUTTON_ID);
      setCoolantOn(coolant.state);
      setCoolantStale(coolant.isStale);
    };
    refreshRelays();
    return subscribeToDeviceStatusChanges(refreshRelays);
  }, []);

  const handleStart = async () => {
    setBusy('start');
    try {
      // 控制端口未连接时，先静默尝试一次重连；失败仅记日志，让 start 自己再试一次
      if (status && status.connectionStatus === false) {
        try {
          await dieselHeaterManager.connectSecondPort();
        } catch (connectErr) {
          console.error(
            '[DieselHeaterSection] 自动重连控制端口失败，详情请到 设置 → 高级控制 → 柴油加热器 手动操作:',
            connectErr,
          );
        }
      }
      await dieselHeaterManager.startHeaterWithHeating();
      setFeedback({ ok: true, text: '已发送开机指令', at: new Date() });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[DieselHeaterSection] 开机失败:', err);
      setFeedback({
        ok: false,
        text: `${msg}（如反复失败，可到 设置 → 高级控制 → 柴油加热器 手动重连）`,
        at: new Date(),
      });
    } finally {
      setBusy(null);
    }
  };

  const handleStop = async () => {
    setBusy('stop');
    try {
      await dieselHeaterManager.stopHeater();
      setFeedback({ ok: true, text: '已发送关机指令', at: new Date() });
    } catch (err: any) {
      setFeedback({
        ok: false,
        text: err?.message ?? String(err),
        at: new Date(),
      });
    } finally {
      setBusy(null);
    }
  };

  const handleApplyTemp = async () => {
    if (targetInput < TEMP_MIN || targetInput > TEMP_MAX) return;
    setBusy('temp');
    try {
      await dieselHeaterManager.setTargetTemperature(targetInput);
      targetDirtyRef.current = false; // 应用成功，恢复跟随设备值
      setFeedback({
        ok: true,
        text: `目标温度已设置为 ${targetInput}°C`,
        at: new Date(),
      });
    } catch (err: any) {
      setFeedback({
        ok: false,
        text: err?.message ?? String(err),
        at: new Date(),
      });
    } finally {
      setBusy(null);
    }
  };

  const handlePowerToggle = async () => {
    setBusy('power');
    const next = !powerOn;
    try {
      if (next) await turnButtonOn(POWER_BUTTON_ID);
      else await turnButtonOff(POWER_BUTTON_ID);
      setPowerOn(next);
      setFeedback({
        ok: true,
        text: next ? '锅炉电源已上电' : '锅炉电源已断开',
        at: new Date(),
      });
    } catch (err: any) {
      setFeedback({
        ok: false,
        text: err?.message ?? String(err),
        at: new Date(),
      });
    } finally {
      setBusy(null);
    }
  };

  const handleCoolantToggle = async () => {
    setBusy('coolant');
    const next = !coolantOn;
    try {
      if (next) await turnButtonOn(COOLANT_BUTTON_ID);
      else await turnButtonOff(COOLANT_BUTTON_ID);
      setCoolantOn(next);
      setFeedback({
        ok: true,
        text: next ? '已接入发动机冷却液' : '已断开发动机冷却液',
        at: new Date(),
      });
    } catch (err: any) {
      setFeedback({
        ok: false,
        text: err?.message ?? String(err),
        at: new Date(),
      });
    } finally {
      setBusy(null);
    }
  };

  const isRunning = status?.isRunning ?? false;
  const isHeating = status?.isHeating ?? false;
  const online = status?.online ?? false;
  const inlet = status?.inletTemperature ?? null;
  const outlet = status?.outletTemperature ?? null;
  const target = status?.targetTemperature ?? null;
  const fault = (status?.faultCode ?? 0) > 0 ? status?.faultText : null;

  // 折叠态摘要：出水 X°C / 目标 Y°C，故障时高亮
  const summary = (
    <span className="inline-flex items-center gap-1.5">
      {fault && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
      <span>
        出水
        <span className="text-gray-800 font-semibold ml-1">
          {outlet !== null ? `${outlet}°C` : '—'}
        </span>
        <span className="text-gray-400 mx-1.5">/</span>
        目标
        <span className="text-gray-800 font-semibold ml-1">
          {target !== null ? `${target}°C` : '—'}
        </span>
      </span>
    </span>
  );

  return (
    <CollapsibleSection
      icon={<Flame className="w-5 h-5 text-orange-600" />}
      iconBg="bg-orange-50"
      title="柴油加热器"
      description="水暖循环加热。开机后约需 1–2 分钟点火完成。"
      summary={summary}
      badge={
        <StatusBadge online={online} isRunning={isRunning} isHeating={isHeating} />
      }
    >
      <div className="space-y-6">
        {/* 温度信息 */}
        <div className="grid grid-cols-3 gap-3">
          <TempStat
            icon={<Thermometer className="w-4 h-4" />}
            label="进水"
            value={inlet}
          />
          <TempStat
            icon={<ThermometerSun className="w-4 h-4" />}
            label="出水"
            value={outlet}
            emphasize
          />
          <TempStat
            icon={<Flame className="w-4 h-4" />}
            label="目标"
            value={target}
          />
        </div>

        {/* 运行/点火/电压 */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <InfoChip label="工作状态" value={status?.workStatusText} />
          <InfoChip label="工作模式" value={status?.workModeText} />
          <InfoChip label="点火" value={status?.ignitionStatusText} />
          {status?.voltage !== undefined && status.voltage > 0 && (
            <InfoChip label="电压" value={`${status.voltage.toFixed(1)} V`} />
          )}
        </div>

        {fault && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="break-all">{fault}</span>
          </div>
        )}

        {/* 启停按钮 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStart}
            disabled={busy !== null || isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition"
          >
            <Play className="w-5 h-5" />
            {busy === 'start' ? '开机中…' : '开机'}
          </button>
          <button
            onClick={handleStop}
            disabled={busy !== null || !isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 transition"
          >
            <Square className="w-5 h-5" />
            {busy === 'stop' ? '关机中…' : '关机'}
          </button>
        </div>

        {/* 目标温度 */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-gray-900">目标温度</div>
              <div className="text-xs text-gray-500">
                可调范围 {TEMP_MIN}–{TEMP_MAX}°C
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-none">
              {targetInput}
              <span className="text-sm font-medium text-gray-500 ml-0.5">°C</span>
            </div>
          </div>
          <input
            type="range"
            min={TEMP_MIN}
            max={TEMP_MAX}
            step={1}
            value={targetInput}
            onChange={(e) => {
              targetDirtyRef.current = true;
              setTargetInput(Number(e.target.value));
            }}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-400">
              当前设备目标：{target !== null ? `${target}°C` : '—'}
            </div>
            <button
              onClick={handleApplyTemp}
              disabled={busy !== null || targetInput === target}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {busy === 'temp' ? '应用中…' : '应用'}
            </button>
          </div>
        </div>

        {/* 硬件控制区：冷却液阀 + 锅炉电源 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 divide-y divide-amber-200">
          <RelayRow
            icon={<Droplets className="w-4 h-4 text-cyan-600" />}
            title="接入发动机冷却液"
            onLabel="已接通"
            offLabel="已切断"
            description="开机前请先接通：冷却液回路连通后，加热器才能正常带水加热。"
            onState={coolantOn}
            stale={coolantStale}
            disabled={busy !== null}
            onToggle={handleCoolantToggle}
          />
          <RelayRow
            icon={<Plug className="w-4 h-4 text-amber-600" />}
            title="锅炉电源"
            onLabel="已上电"
            offLabel="已断电"
            description="加热器无法连接控制时，断电后重新上电可恢复 CAN 通讯。"
            onState={powerOn}
            stale={powerStale}
            disabled={busy !== null}
            onToggle={handlePowerToggle}
          />
        </div>

        {/* 反馈条 */}
        {feedback && (
          <div className="text-sm flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 ${
                feedback.ok ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="break-all">{feedback.text}</span>
              <span className="text-gray-400 ml-1">
                {feedback.at.toLocaleTimeString()}
              </span>
            </span>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

const TempStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | null;
  emphasize?: boolean;
}> = ({ icon, label, value, emphasize }) => (
  <div
    className={`rounded-lg border p-3 ${
      emphasize
        ? 'bg-orange-50 border-orange-100'
        : 'bg-gray-50 border-gray-100'
    }`}
  >
    <div className="flex items-center gap-1 text-xs text-gray-500">
      {icon}
      <span>{label}</span>
    </div>
    <div
      className={`mt-1 text-2xl font-bold ${
        emphasize ? 'text-orange-700' : 'text-gray-900'
      } leading-tight`}
    >
      {value !== null ? value : '—'}
      <span className="text-sm font-medium text-gray-500 ml-0.5">°C</span>
    </div>
  </div>
);

const InfoChip: React.FC<{ label: string; value?: string }> = ({
  label,
  value,
}) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-600">
    <span className="text-gray-400">{label}</span>
    <span className="font-medium text-gray-800">{value ?? '—'}</span>
  </span>
);

const StatusBadge: React.FC<{
  online: boolean;
  isRunning: boolean;
  isHeating: boolean;
}> = ({ online, isRunning, isHeating }) => {
  if (!online) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
        离线
      </span>
    );
  }
  if (isHeating) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
        加热中
      </span>
    );
  }
  if (isRunning) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
        运行中
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">
      已停止
    </span>
  );
};

export default DieselHeaterSection;
