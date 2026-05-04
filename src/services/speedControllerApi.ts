import { api } from './apiConfig';

export interface SpeedControllerState {
  voltagePercent: number | null;
  pwmFrequencyKhz: number | null;
  voltageUpdatedAt: string | null;
  pwmUpdatedAt: string | null;
  voltageError?: string;
  pwmError?: string;
  /** 本次响应是否完全来自后端缓存（未触发 modbus 读） */
  cached: boolean;
}

export interface SpeedControllerStateResponse {
  success: boolean;
  slaveAddress: number;
  data: SpeedControllerState;
}

/**
 * 拉取调速器状态。
 * - refresh=false（默认）：走后端内存缓存，不打扰 modbus 总线
 * - refresh=true：强制真读（用户点了刷新按钮）
 */
export async function fetchSpeedControllerState(
  refresh = false,
): Promise<SpeedControllerState> {
  const res = await api.get<SpeedControllerStateResponse>(
    '/speed-controller/state',
    {
      params: refresh ? { refresh: 'true' } : undefined,
    },
  );
  return res.data.data;
}

export async function setSpeedControllerVoltage(value: number): Promise<number> {
  const res = await api.post<{ success: boolean; voltagePercent: number }>(
    '/speed-controller/voltage',
    { value },
  );
  return res.data.voltagePercent;
}

export async function setSpeedControllerPwm(value: number): Promise<number> {
  const res = await api.post<{ success: boolean; pwmFrequencyKhz: number }>(
    '/speed-controller/pwm',
    { value },
  );
  return res.data.pwmFrequencyKhz;
}
