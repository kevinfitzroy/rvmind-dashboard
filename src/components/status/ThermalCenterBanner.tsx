import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Fan, Flame, Wind } from 'lucide-react';
import {
  addDieselHeaterListener,
  DetailedStatus,
  dieselHeaterManager,
  removeDieselHeaterListener,
} from '../../services/dieselHeaterApi';
import {
  fetchSpeedControllerState,
  SpeedControllerState,
} from '../../services/speedControllerApi';
import {
  getButtonState,
  subscribeToDeviceStatusChanges,
} from '../../services/api';

const VENT_FANS: Array<{ id: string; shortName: string }> = [
  { id: 'fan1_switch', shortName: '厨房' },
  { id: 'fan2_switch', shortName: '电气仓' },
];

const ThermalCenterBanner: React.FC = () => {
  const [heater, setHeater] = useState<DetailedStatus | null>(
    dieselHeaterManager.getCurrentStatus(),
  );
  const [speed, setSpeed] = useState<SpeedControllerState | null>(null);
  const [vent, setVent] = useState<Array<{ shortName: string; on: boolean; stale: boolean }>>(
    () =>
      VENT_FANS.map((f) => {
        const s = getButtonState(f.id);
        return { shortName: f.shortName, on: s.state, stale: s.isStale };
      }),
  );

  useEffect(() => {
    const refresh = () =>
      setVent(
        VENT_FANS.map((f) => {
          const s = getButtonState(f.id);
          return { shortName: f.shortName, on: s.state, stale: s.isStale };
        }),
      );
    refresh();
    return subscribeToDeviceStatusChanges(refresh);
  }, []);

  useEffect(() => {
    dieselHeaterManager.startPeriodicUpdate(2000);
    const listener = (s: DetailedStatus | null) => setHeater(s);
    addDieselHeaterListener(listener);
    dieselHeaterManager.fetchDetailedStatus();
    return () => {
      removeDieselHeaterListener(listener);
      // 不 stopPeriodicUpdate：其他页面/组件可能也在订阅同一个 manager
    };
  }, []);

  useEffect(() => {
    fetchSpeedControllerState(false)
      .then(setSpeed)
      .catch(() => {
        /* banner 仅展示，失败时静默 */
      });
  }, []);

  // —— 加热器摘要 ——
  const isFault = (heater?.faultCode ?? 0) > 0;
  const isHeating = heater?.isHeating ?? false;
  const isRunning = heater?.isRunning ?? false;
  const heaterOnline = heater?.online ?? false;
  const outlet = heater?.outletTemperature ?? null;
  const target = heater?.targetTemperature ?? null;

  const heaterStatusLabel = isFault
    ? '故障'
    : isHeating
      ? '加热中'
      : isRunning
        ? '运行中'
        : heaterOnline
          ? '已停止'
          : '离线';

  const heaterBadgeClass = isFault
    ? 'bg-red-50 text-red-700'
    : isHeating
      ? 'bg-orange-50 text-orange-700'
      : isRunning
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-gray-100 text-gray-500';

  const heaterSummary =
    outlet !== null && target !== null
      ? `出水 ${outlet}°C / 目标 ${target}°C`
      : '尚未读取';

  // —— 暖风机摘要 ——
  const speedPercent = speed?.voltagePercent ?? null;
  const speedOnline = speedPercent !== null;
  const speedSummary =
    speedPercent === null
      ? '尚未读取'
      : `${speedPercent}% · ${labelOf(speedPercent)}`;

  // —— 通风摘要 ——
  const ventOnList = vent.filter((v) => v.on);
  const ventAllStale = vent.length > 0 && vent.every((v) => v.stale);
  const ventSummary = ventAllStale
    ? '尚未读取'
    : ventOnList.length === 0
      ? '全部关闭'
      : `${ventOnList.map((v) => v.shortName).join('、')} 运行中`;
  const ventBadgeText = ventAllStale
    ? '未知'
    : ventOnList.length === 0
      ? '静止'
      : `${ventOnList.length}/${vent.length}`;
  const ventBadgeClass = ventAllStale
    ? 'bg-gray-100 text-gray-500'
    : ventOnList.length === 0
      ? 'bg-gray-100 text-gray-500'
      : 'bg-sky-50 text-sky-700';

  return (
    <Link to="/thermal-center" className="block group">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              热控中心
            </span>
            <span className="text-xs text-gray-400">日常温控简报</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition" />
        </div>
        <div className="divide-y divide-gray-50">
          <Row
            iconBg="bg-blue-50"
            icon={<Wind className="w-4 h-4 text-blue-600" />}
            title="暖风机"
            summary={speedSummary}
            badgeText={speedOnline ? '在线' : '未知'}
            badgeClass={
              speedOnline
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }
          />
          <Row
            iconBg="bg-orange-50"
            icon={
              isFault ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <Flame className="w-4 h-4 text-orange-600" />
              )
            }
            title="柴油加热器"
            summary={heaterSummary}
            badgeText={heaterStatusLabel}
            badgeClass={heaterBadgeClass}
          />
          <Row
            iconBg="bg-sky-50"
            icon={<Fan className="w-4 h-4 text-sky-600" />}
            title="车内通风"
            summary={ventSummary}
            badgeText={ventBadgeText}
            badgeClass={ventBadgeClass}
          />
        </div>
      </div>
    </Link>
  );
};

const Row: React.FC<{
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  badgeText: string;
  badgeClass: string;
}> = ({ iconBg, icon, title, summary, badgeText, badgeClass }) => (
  <div className="flex items-center gap-3 px-5 py-3">
    <div
      className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-0.5 truncate">{summary}</div>
    </div>
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${badgeClass}`}
    >
      {badgeText}
    </span>
  </div>
);

function labelOf(percent: number): string {
  if (percent === 0) return '关';
  if (percent <= 30) return '低';
  if (percent <= 60) return '中';
  return '高';
}

export default ThermalCenterBanner;
