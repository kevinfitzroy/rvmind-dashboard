import React, { useEffect, useState } from 'react';
import { ArrowLeft, Gauge, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchSpeedControllerState,
  setSpeedControllerPwm,
  setSpeedControllerVoltage,
  SpeedControllerState,
} from '../services/speedControllerApi';

const EMPTY_STATE: SpeedControllerState = {
  voltagePercent: null,
  pwmFrequencyKhz: null,
  voltageUpdatedAt: null,
  pwmUpdatedAt: null,
  cached: true,
};

function fmtTime(iso: string | null): string {
  if (!iso) return '尚未读取';
  return new Date(iso).toLocaleTimeString();
}

const SpeedControllerPage: React.FC = () => {
  const navigate = useNavigate();

  const [state, setState] = useState<SpeedControllerState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [voltageInput, setVoltageInput] = useState<number>(0);
  const [pwmInput, setPwmInput] = useState<number>(1);
  const [voltageBusy, setVoltageBusy] = useState(false);
  const [pwmBusy, setPwmBusy] = useState(false);

  // 进入页面：先拿一次后端缓存（不打扰 modbus 总线）
  useEffect(() => {
    fetchSpeedControllerState(false)
      .then(setState)
      .catch((err: any) => setLastError(err?.message ?? String(err)));
  }, []);

  const refresh = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const data = await fetchSpeedControllerState(true);
      setState(data);
      // readState 单边失败会把错误塞到 voltageError/pwmError 里返回，不抛
      if (data.voltageError || data.pwmError) {
        setLastError(data.voltageError ?? data.pwmError ?? null);
      }
    } catch (err: any) {
      setLastError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const onSetVoltage = async () => {
    setVoltageBusy(true);
    setLastError(null);
    try {
      await setSpeedControllerVoltage(voltageInput);
      // 写入成功 → 本地直接反映，不再 modbus 多打一次
      setState((prev) => ({
        ...prev,
        voltagePercent: voltageInput,
        voltageUpdatedAt: new Date().toISOString(),
        voltageError: undefined,
      }));
    } catch (err: any) {
      setLastError(
        err?.response?.data?.error ?? err?.message ?? String(err),
      );
    } finally {
      setVoltageBusy(false);
    }
  };

  const onSetPwm = async () => {
    setPwmBusy(true);
    setLastError(null);
    try {
      await setSpeedControllerPwm(pwmInput);
      setState((prev) => ({
        ...prev,
        pwmFrequencyKhz: pwmInput,
        pwmUpdatedAt: new Date().toISOString(),
        pwmError: undefined,
      }));
    } catch (err: any) {
      setLastError(
        err?.response?.data?.error ?? err?.message ?? String(err),
      );
    } finally {
      setPwmBusy(false);
    }
  };

  const fmtRegValue = (v: number | null, suffix: string, err?: string) => {
    if (err) return <span className="text-red-600">读取失败</span>;
    if (v === null || v === undefined)
      return <span className="text-gray-400">—</span>;
    return (
      <span>
        {v}
        <span className="text-gray-500 text-base ml-1">{suffix}</span>
      </span>
    );
  };

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gauge className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">
              调速器寄存器调试
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            低层调试入口：直接读写调速器 Modbus 寄存器（FC03 / FC06）。
            数值默认来自后端内存缓存——写入后会自动更新，"刷新"按钮才会真打 modbus。
            日常调节请使用
            <span
              className="text-blue-600 cursor-pointer underline"
              onClick={() => navigate('/thermal-center')}
            >
              {' '}
              热控中心
            </span>
            。
          </p>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* 设备信息 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">串口</div>
              <div className="font-mono">/dev/ttyS9</div>
            </div>
            <div>
              <div className="text-gray-500">从机地址</div>
              <div className="font-mono">0x1F (31)</div>
            </div>
            <div>
              <div className="text-gray-500">读功能码</div>
              <div className="font-mono">0x03</div>
            </div>
            <div>
              <div className="text-gray-500">写功能码</div>
              <div className="font-mono">0x06</div>
            </div>
          </div>
        </div>

        {/* 当前值 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">当前值</h2>
              <div className="text-xs text-gray-400">
                {state.cached ? '来自缓存' : '已强制刷新'}
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? '刷新中…' : '从设备刷新'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-gray-500 text-sm mb-1">
                电压百分比（寄存器 0x0001）
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {fmtRegValue(
                  state.voltagePercent,
                  '%',
                  state.voltageError,
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                上次更新：{fmtTime(state.voltageUpdatedAt)}
              </div>
              {state.voltageError && (
                <div className="text-xs text-red-500 mt-1 break-all">
                  {state.voltageError}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-gray-500 text-sm mb-1">
                PWM 频率（寄存器 0x0003）
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {fmtRegValue(
                  state.pwmFrequencyKhz,
                  'kHz',
                  state.pwmError,
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                上次更新：{fmtTime(state.pwmUpdatedAt)}
              </div>
              {state.pwmError && (
                <div className="text-xs text-red-500 mt-1 break-all">
                  {state.pwmError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 设置电压 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            设置电压百分比
          </h2>
          <div className="text-sm text-gray-500 mb-3">
            范围 0–100（0x00–0x64）
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={voltageInput}
              onChange={(e) => setVoltageInput(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={voltageInput}
              onChange={(e) => setVoltageInput(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-right"
            />
            <span className="text-gray-500">%</span>
            <button
              onClick={onSetVoltage}
              disabled={voltageBusy}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {voltageBusy ? '写入中…' : '写入'}
            </button>
          </div>
        </div>

        {/* 设置 PWM 频率 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            设置 PWM 频率
          </h2>
          <div className="text-sm text-gray-500 mb-3">
            范围 1–20 kHz（寄存器值 1–20，1 kHz 步进）
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={pwmInput}
              onChange={(e) => setPwmInput(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={pwmInput}
              onChange={(e) => setPwmInput(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-right"
            />
            <span className="text-gray-500">kHz</span>
            <button
              onClick={onSetPwm}
              disabled={pwmBusy}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {pwmBusy ? '写入中…' : '写入'}
            </button>
          </div>
        </div>

        {lastError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm break-all">
            {lastError}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeedControllerPage;
