import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, X, Power } from 'lucide-react';
import { getSystemHealth, restartServer } from '../../services/api';

type Phase = 'idle' | 'confirming' | 'restarting' | 'success' | 'error';

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 60_000;

const RestartServerAction: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const restartStartRef = useRef<number | null>(null);
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const preRestartUptimeRef = useRef<number>(0);

  const clearTimers = () => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    tickTimerRef.current = null;
    pollTimerRef.current = null;
  };

  useEffect(() => () => clearTimers(), []);

  const beginRestart = async () => {
    setPhase('restarting');
    setElapsed(0);
    setErrorMsg(null);
    restartStartRef.current = Date.now();

    // 记录重启前的 uptime，用于判断进程是否已经被替换
    try {
      const before = await getSystemHealth();
      preRestartUptimeRef.current = before.uptime;
    } catch {
      preRestartUptimeRef.current = Number.MAX_SAFE_INTEGER;
    }

    try {
      await restartServer();
    } catch (err) {
      // 即使请求被中断也算正常（服务器可能在响应前就已退出）
      console.warn('restart request ended:', err);
    }

    tickTimerRef.current = setInterval(() => {
      const start = restartStartRef.current ?? Date.now();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);

    schedulePoll();
  };

  const schedulePoll = () => {
    pollTimerRef.current = setTimeout(pollHealth, POLL_INTERVAL_MS);
  };

  const pollHealth = async () => {
    const start = restartStartRef.current ?? Date.now();
    const waited = Date.now() - start;

    if (waited > MAX_WAIT_MS) {
      clearTimers();
      setPhase('error');
      setErrorMsg('等待服务器恢复超时，请手动检查服务状态。');
      return;
    }

    try {
      const health = await getSystemHealth();
      // 新进程的 uptime 一定小于旧进程
      if (health.uptime < preRestartUptimeRef.current) {
        clearTimers();
        setPhase('success');
        setTimeout(() => {
          setPhase((p) => (p === 'success' ? 'idle' : p));
        }, 2500);
        return;
      }
    } catch {
      // 服务器还没起来，继续轮询
    }
    schedulePoll();
  };

  const dismissError = () => {
    clearTimers();
    setPhase('idle');
    setErrorMsg(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase('confirming')}
        disabled={phase === 'restarting'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-medium shadow-sm transition-colors"
      >
        <Power className="w-4 h-4" />
        重启服务器
      </button>

      {phase === 'confirming' && (
        <Modal onClose={() => setPhase('idle')}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">确认重启服务器？</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                服务器将立即退出并由 systemd 自动重新拉起，整个过程大约需要 <span className="font-medium text-gray-900">5–10 秒</span>。期间 CAN、Modbus、实时状态推送将短暂中断。
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={beginRestart}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
            >
              确认重启
            </button>
          </div>
        </Modal>
      )}

      {phase === 'restarting' && (
        <Modal>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">正在重启服务器…</h3>
            <p className="text-sm text-gray-500 mt-2">
              已等待 <span className="font-mono font-medium text-gray-900">{elapsed}s</span>，请保持页面打开
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-5 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (elapsed / 12) * 100)}%` }}
              />
            </div>
          </div>
        </Modal>
      )}

      {phase === 'success' && (
        <Modal>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">服务器已恢复运行</h3>
            <p className="text-sm text-gray-500 mt-2">通信链路已重新建立</p>
          </div>
        </Modal>
      )}

      {phase === 'error' && (
        <Modal onClose={dismissError}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">重启未确认成功</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {errorMsg ?? '未能在预期时间内联系到服务器。'}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={dismissError}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
            >
              我知道了
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default RestartServerAction;
