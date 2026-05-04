import React, { useEffect, useState } from 'react';
import {
  Wind,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Droplets,
  Power,
  PlugZap,
} from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import FanSpeedDial from './FanSpeedDial';
import RelayRow from './RelayRow';
import {
  fetchSpeedControllerState,
  setSpeedControllerVoltage,
  SpeedControllerState,
} from '../../services/speedControllerApi';
import {
  getButtonState,
  subscribeToDeviceStatusChanges,
  turnButtonOff,
  turnButtonOn,
} from '../../services/api';

const COOLANT_BUTTON_ID = 'solenoid_valve_signal_fan';
const FAN_POWER_BUTTON_ID = 'fan-power';

const PRESETS: Array<{ label: string; value: number }> = [
  { label: '关', value: 0 },
  { label: '低', value: 30 },
  { label: '中', value: 60 },
  { label: '高', value: 100 },
];

interface WriteFeedback {
  ok: boolean;
  text: string;
  at: Date;
}

type BusyKind = null | 'speed' | 'coolant' | 'power';

function formatRelative(iso: string | null): string {
  if (!iso) return '尚未读取';
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))} 秒前`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`;
  return new Date(iso).toLocaleString();
}

const FanSpeedSection: React.FC = () => {
  const [state, setState] = useState<SpeedControllerState | null>(null);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<WriteFeedback | null>(null);

  const [coolantOn, setCoolantOn] = useState<boolean>(
    () => getButtonState(COOLANT_BUTTON_ID).state,
  );
  const [coolantStale, setCoolantStale] = useState<boolean>(
    () => getButtonState(COOLANT_BUTTON_ID).isStale,
  );
  const [powerOn, setPowerOn] = useState<boolean>(
    () => getButtonState(FAN_POWER_BUTTON_ID).state,
  );
  const [powerStale, setPowerStale] = useState<boolean>(
    () => getButtonState(FAN_POWER_BUTTON_ID).isStale,
  );

  // 调速器初始拉一次缓存
  useEffect(() => {
    fetchSpeedControllerState(false)
      .then(setState)
      .catch((err) => {
        setFeedback({
          ok: false,
          text: err?.message ?? String(err),
          at: new Date(),
        });
      });
  }, []);

  // 继电器状态订阅
  useEffect(() => {
    const refreshRelays = () => {
      const c = getButtonState(COOLANT_BUTTON_ID);
      setCoolantOn(c.state);
      setCoolantStale(c.isStale);
      const p = getButtonState(FAN_POWER_BUTTON_ID);
      setPowerOn(p.state);
      setPowerStale(p.isStale);
    };
    refreshRelays();
    return subscribeToDeviceStatusChanges(refreshRelays);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchSpeedControllerState(true);
      setState(data);
      if (data.voltageError) {
        setFeedback({
          ok: false,
          text: `刷新失败：${data.voltageError}`,
          at: new Date(),
        });
      } else {
        setFeedback({ ok: true, text: '已从设备刷新', at: new Date() });
      }
    } catch (err: any) {
      setFeedback({
        ok: false,
        text:
          err?.response?.data?.error ?? err?.message ?? String(err),
        at: new Date(),
      });
    } finally {
      setRefreshing(false);
    }
  };

  const commitSpeed = async (value: number) => {
    if (controllerOff) {
      setFeedback({
        ok: false,
        text: '调速器未供电，请先开启暖风机供电',
        at: new Date(),
      });
      return;
    }
    setBusy('speed');
    try {
      await setSpeedControllerVoltage(value);
      setState((prev) =>
        prev
          ? {
              ...prev,
              voltagePercent: value,
              voltageUpdatedAt: new Date().toISOString(),
              voltageError: undefined,
              cached: true,
            }
          : {
              voltagePercent: value,
              pwmFrequencyKhz: null,
              voltageUpdatedAt: new Date().toISOString(),
              pwmUpdatedAt: null,
              cached: true,
            },
      );
      setFeedback({ ok: true, text: `已设置为 ${value}%`, at: new Date() });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? err?.message ?? String(err);
      setFeedback({ ok: false, text: msg, at: new Date() });
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
        text: next ? '暖风机已接入冷却液' : '已切断暖风机冷却液',
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
      if (next) await turnButtonOn(FAN_POWER_BUTTON_ID);
      else await turnButtonOff(FAN_POWER_BUTTON_ID);
      setPowerOn(next);
      setFeedback({
        ok: true,
        text: next ? '暖风机已上电' : '暖风机已断电',
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

  const current = state?.voltagePercent ?? null;
  const speedOnline = current !== null;
  // 调速器与暖风机共用一路供电；状态过期时按"未知"处理，不阻塞操作
  const controllerOff = !powerStale && !powerOn;
  const controllerInteractive = !controllerOff;

  // 折叠态摘要：转速 + 档位 + 关键硬件警告
  const summary = (
    <span className="inline-flex items-center gap-1.5">
      {current !== null ? (
        <>
          <span className="font-semibold text-gray-800">{current}%</span>
          <span className="text-gray-400 mx-1.5">·</span>
          <span>{labelOf(current)}</span>
        </>
      ) : (
        <span className="text-gray-400">尚未读取</span>
      )}
      {!coolantStale && !coolantOn && (
        <span className="text-amber-600 ml-2">· 未接冷却液</span>
      )}
      {!powerStale && !powerOn && (
        <span className="text-amber-600 ml-2">· 未供电</span>
      )}
    </span>
  );

  const badge = controllerOff ? (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
      断电
    </span>
  ) : (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        speedOnline
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {speedOnline ? '在线' : '未知'}
    </span>
  );

  return (
    <CollapsibleSection
      icon={<Wind className="w-5 h-5 text-blue-600" />}
      iconBg="bg-blue-50"
      title="暖风机"
      description="水暖暖风机：冷却液回路 → 暖风机供电 → 调速器调节风量。"
      summary={summary}
      badge={badge}
    >
      <div className="flex flex-col items-center gap-6">
        {controllerOff && (
          <div className="w-full flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <PlugZap className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              暖风机供电已断开，调速器随之掉电；当前调速操作不可用，请先在下方
              <span className="font-medium">「暖风机供电」</span>
              开关接通电源。
            </span>
          </div>
        )}

        <FanSpeedDial
          value={current}
          busy={busy === 'speed'}
          online={speedOnline && controllerInteractive}
          onCommit={commitSpeed}
        />

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {PRESETS.map((p) => {
            const active = current === p.value;
            return (
              <button
                key={p.label}
                disabled={busy !== null || controllerOff}
                onClick={() => commitSpeed(p.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                title={controllerOff ? '调速器未供电' : undefined}
              >
                {p.label}
                <span
                  className={`ml-1.5 text-xs ${
                    active ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {p.value}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            上次更新：
            <span className="text-gray-700 font-medium ml-1">
              {formatRelative(state?.voltageUpdatedAt ?? null)}
            </span>
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing || busy !== null || controllerOff}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={controllerOff ? '调速器未供电' : undefined}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? '刷新中…' : '从设备刷新'}
          </button>
        </div>
      </div>

      {/* 硬件控制区：水路 + 供电 */}
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 divide-y divide-amber-200">
        <RelayRow
          icon={<Droplets className="w-4 h-4 text-cyan-600" />}
          title="暖风机接入冷却液"
          onLabel="已接通"
          offLabel="已切断"
          description="开启暖风前请先接通冷却液回路，否则风机吹冷风。"
          onState={coolantOn}
          stale={coolantStale}
          disabled={busy !== null}
          onToggle={handleCoolantToggle}
        />
        <RelayRow
          icon={<Power className="w-4 h-4 text-amber-600" />}
          title="暖风机供电"
          onLabel="已上电"
          offLabel="已断电"
          description="给暖风机风扇电机供电；调速器只在风扇通电时才有效。"
          onState={powerOn}
          stale={powerStale}
          disabled={busy !== null}
          onToggle={handlePowerToggle}
        />
      </div>

      {feedback && (
        <div className="mt-4 h-6 text-sm flex items-center">
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
    </CollapsibleSection>
  );
};

function labelOf(percent: number): string {
  if (percent === 0) return '关';
  if (percent <= 30) return '低';
  if (percent <= 60) return '中';
  return '高';
}

export default FanSpeedSection;
