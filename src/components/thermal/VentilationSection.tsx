import React, { useEffect, useState } from 'react';
import {
  Fan,
  ChefHat,
  Cpu,
  AlertCircle,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import {
  getButtonState,
  subscribeToDeviceStatusChanges,
  turnButtonOff,
  turnButtonOn,
} from '../../services/api';

const KITCHEN_FAN_ID = 'fan1_switch';
const TECHBAY_FAN_ID = 'fan2_switch';

interface FanModel {
  id: string;
  name: string;
  shortName: string;
  hint: string;
  icon: React.ReactNode;
  /** tailwind 颜色片段, e.g. 'cyan' / 'indigo' */
  accent: 'cyan' | 'indigo';
}

const FANS: FanModel[] = [
  {
    id: KITCHEN_FAN_ID,
    name: '厨房抽气风扇',
    shortName: '厨房',
    hint: '排出烹饪油烟',
    icon: <ChefHat className="w-4 h-4" />,
    accent: 'cyan',
  },
  {
    id: TECHBAY_FAN_ID,
    name: '高压电气仓风扇',
    shortName: '电气仓',
    hint: '设备舱散热',
    icon: <Cpu className="w-4 h-4" />,
    accent: 'indigo',
  },
];

interface Feedback {
  ok: boolean;
  text: string;
  at: Date;
}

interface FanRuntime {
  on: boolean;
  stale: boolean;
  busy: boolean;
}

const VentilationSection: React.FC = () => {
  const [runtimes, setRuntimes] = useState<Record<string, FanRuntime>>(() => {
    const init: Record<string, FanRuntime> = {};
    for (const f of FANS) {
      const s = getButtonState(f.id);
      init[f.id] = { on: s.state, stale: s.isStale, busy: false };
    }
    return init;
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const refresh = () => {
      setRuntimes((prev) => {
        const next = { ...prev };
        for (const f of FANS) {
          const s = getButtonState(f.id);
          next[f.id] = {
            ...next[f.id],
            on: s.state,
            stale: s.isStale,
          };
        }
        return next;
      });
    };
    refresh();
    return subscribeToDeviceStatusChanges(refresh);
  }, []);

  const setBusy = (id: string, busy: boolean) =>
    setRuntimes((prev) => ({ ...prev, [id]: { ...prev[id], busy } }));

  const toggleFan = async (fan: FanModel) => {
    const cur = runtimes[fan.id];
    if (!cur || cur.busy) return;
    const next = !cur.on;
    setBusy(fan.id, true);
    // 乐观更新：立刻翻转，失败再回滚
    setRuntimes((prev) => ({
      ...prev,
      [fan.id]: { ...prev[fan.id], on: next },
    }));
    try {
      if (next) await turnButtonOn(fan.id);
      else await turnButtonOff(fan.id);
      setFeedback({
        ok: true,
        text: `${fan.name}已${next ? '开启' : '关闭'}`,
        at: new Date(),
      });
    } catch (err: any) {
      setRuntimes((prev) => ({
        ...prev,
        [fan.id]: { ...prev[fan.id], on: cur.on },
      }));
      setFeedback({
        ok: false,
        text: `${fan.name}操作失败：${err?.message ?? String(err)}`,
        at: new Date(),
      });
    } finally {
      setBusy(fan.id, false);
    }
  };

  const allOn = FANS.every((f) => runtimes[f.id]?.on);
  const anyOn = FANS.some((f) => runtimes[f.id]?.on);
  const anyBusy = FANS.some((f) => runtimes[f.id]?.busy);

  const handleAll = async (turnOn: boolean) => {
    for (const f of FANS) {
      const cur = runtimes[f.id];
      if (!cur || cur.on === turnOn) continue;
      // 直接 await，避免两路 Modbus 同时争抢
      await toggleFan(f);
    }
  };

  const onCount = FANS.filter((f) => runtimes[f.id]?.on).length;
  const summary = (
    <span className="inline-flex items-center gap-1.5">
      {anyOn ? (
        <>
          <span className="font-semibold text-gray-800">{onCount}</span>
          <span className="text-gray-500">/ {FANS.length} 运行中</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-gray-500">
            {FANS.filter((f) => runtimes[f.id]?.on)
              .map((f) => f.shortName)
              .join('、')}
          </span>
        </>
      ) : (
        <span className="text-gray-400">全部关闭</span>
      )}
    </span>
  );

  const badge = (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        anyOn
          ? 'bg-sky-50 text-sky-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {anyOn ? '通风中' : '静止'}
    </span>
  );

  return (
    <CollapsibleSection
      icon={<Fan className="w-5 h-5 text-sky-600" />}
      iconBg="bg-sky-50"
      title="车内通风"
      description="独立控制车内两路排风扇：厨房抽气、电气仓散热。"
      summary={summary}
      badge={badge}
    >
      <div className="space-y-4">
        {/* 双风扇可视化卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FANS.map((f) => (
            <FanTile
              key={f.id}
              fan={f}
              runtime={runtimes[f.id]}
              onToggle={() => toggleFan(f)}
            />
          ))}
        </div>

        {/* 一键全开 / 全关 */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-xs text-gray-500">
            {anyOn ? '排出热气与油烟，建议短时使用' : '所有排风扇已关闭'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAll(true)}
              disabled={anyBusy || allOn}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              全部开
            </button>
            <button
              onClick={() => handleAll(false)}
              disabled={anyBusy || !anyOn}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              全部关
            </button>
          </div>
        </div>

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

/* ---------- 单个风扇磁贴：旋转扇叶 + 气流条纹 ---------- */

const ACCENT_STYLES: Record<
  FanModel['accent'],
  {
    onBg: string;
    onBorder: string;
    onIconBg: string;
    onText: string;
    streak: string;
    glow: string;
  }
> = {
  cyan: {
    onBg: 'bg-gradient-to-br from-cyan-50 via-sky-50 to-white',
    onBorder: 'border-cyan-300',
    onIconBg: 'bg-cyan-500 text-white',
    onText: 'text-cyan-700',
    streak: 'from-cyan-300/0 via-cyan-400/50 to-cyan-300/0',
    glow: 'shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]',
  },
  indigo: {
    onBg: 'bg-gradient-to-br from-indigo-50 via-violet-50 to-white',
    onBorder: 'border-indigo-300',
    onIconBg: 'bg-indigo-500 text-white',
    onText: 'text-indigo-700',
    streak: 'from-indigo-300/0 via-indigo-400/50 to-indigo-300/0',
    glow: 'shadow-[0_0_24px_-6px_rgba(99,102,241,0.55)]',
  },
};

const FanTile: React.FC<{
  fan: FanModel;
  runtime?: FanRuntime;
  onToggle: () => void;
}> = ({ fan, runtime, onToggle }) => {
  const on = runtime?.on ?? false;
  const stale = runtime?.stale ?? true;
  const busy = runtime?.busy ?? false;
  const a = ACCENT_STYLES[fan.accent];

  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-pressed={on}
      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300
        ${
          on
            ? `${a.onBg} ${a.onBorder} ${a.glow}`
            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
        }
        ${busy ? 'opacity-80' : ''}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-400`}
    >
      {/* 气流条纹：仅开启时可见，对角线漂移 */}
      {on && (
        <>
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-y-2 -left-1/3 w-1/2 bg-gradient-to-r ${a.streak} blur-sm`}
            style={{
              animation: 'rvm-fan-streak 2.4s linear infinite',
            }}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 bg-gradient-to-r ${a.streak} blur-sm`}
            style={{
              animation: 'rvm-fan-streak 2.4s linear infinite',
              animationDelay: '1.2s',
            }}
          />
        </>
      )}

      <div className="relative p-4 flex items-start gap-3">
        {/* 旋转扇叶圆盘 */}
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            on ? a.onIconBg : 'bg-white border border-gray-200 text-gray-400'
          }`}
        >
          <Fan
            className="w-7 h-7"
            style={
              on
                ? {
                    animation: 'spin 2.2s linear infinite',
                  }
                : undefined
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                on ? a.onText : 'text-gray-400'
              }`}
            >
              {fan.icon}
            </span>
            <span
              className={`text-sm font-semibold truncate ${
                on ? 'text-gray-900' : 'text-gray-700'
              }`}
            >
              {fan.name}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-gray-500 truncate">{fan.hint}</div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                on
                  ? `${a.onText} bg-white/70 ring-1 ring-inset ring-current/10`
                  : 'text-gray-500 bg-white border border-gray-200'
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  on ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                }`}
              />
              {busy ? '切换中…' : on ? '运行中' : '已关闭'}
            </span>
            {stale && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                <WifiOff className="w-3 h-3" />
                状态过期
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 底部"轻按切换"提示条 */}
      <div
        className={`relative px-4 py-1.5 text-[11px] font-medium border-t transition-colors ${
          on
            ? `${a.onText} border-white/60 bg-white/40`
            : 'text-gray-400 border-gray-200 bg-white'
        }`}
      >
        {on ? '点击关闭' : '点击开启'}
      </div>
    </button>
  );
};

export default VentilationSection;
