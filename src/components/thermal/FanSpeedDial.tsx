import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FanSpeedDialProps {
  /** 当前后端返回的真实百分比，0-100；null 表示未知 */
  value: number | null;
  /** 用户拖动结束（pointerup）或点击轨道时触发，传入 0-100 整数 */
  onCommit: (next: number) => void;
  /** 是否正在写入；为 true 时弱化交互 */
  busy?: boolean;
  /** 设备是否在线 */
  online?: boolean;
  /** 中心副标题（"暖风机转速"等） */
  caption?: string;
}

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 110;
const STROKE = 18;
const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const SWEEP = MAX_ANGLE - MIN_ANGLE; // 270°

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function angleFromPointer(
  el: SVGSVGElement,
  clientX: number,
  clientY: number,
) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  // 0° = up, clockwise positive
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle > MAX_ANGLE) {
    // 落在底部缺口右半侧 — 选最近端
    const toMax = Math.abs(angle - MAX_ANGLE);
    const toMin = Math.abs(angle - 360 - MIN_ANGLE);
    angle = toMax < toMin ? MAX_ANGLE : MIN_ANGLE;
  } else if (angle < MIN_ANGLE) {
    const toMin = Math.abs(angle - MIN_ANGLE);
    const toMax = Math.abs(angle + 360 - MAX_ANGLE);
    angle = toMin < toMax ? MIN_ANGLE : MAX_ANGLE;
  }
  return angle;
}

function angleToPercent(angle: number) {
  return Math.round(((angle - MIN_ANGLE) / SWEEP) * 100);
}

const FanSpeedDial: React.FC<FanSpeedDialProps> = ({
  value,
  onCommit,
  busy = false,
  online = true,
  caption = '暖风机转速',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragValueRef = useRef<number | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const isDragging = dragValue !== null;

  // 显示用值：拖动时跟着指针，否则反映后端真实值
  const displayPercent =
    dragValue !== null ? dragValue : value !== null ? clamp(value, 0, 100) : 0;
  const safePercent = clamp(displayPercent, 0, 100);

  const trackPath = describeArc(CENTER, CENTER, RADIUS, MIN_ANGLE, MAX_ANGLE);
  const progressEndAngle = MIN_ANGLE + (safePercent / 100) * SWEEP;
  const progressPath = describeArc(
    CENTER,
    CENTER,
    RADIUS,
    MIN_ANGLE,
    Math.max(MIN_ANGLE + 0.0001, progressEndAngle),
  );
  const thumb = polarToCartesian(CENTER, CENTER, RADIUS, progressEndAngle);

  const updateFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const angle = angleFromPointer(svgRef.current, clientX, clientY);
    const next = angleToPercent(angle);
    dragValueRef.current = next;
    setDragValue(next);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (busy || !online) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromEvent(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !online) return;
    updateFromEvent(e.clientX, e.clientY);
  };
  const finishDrag = () => {
    if (dragValueRef.current !== null) {
      const committed = clamp(dragValueRef.current, 0, 100);
      dragValueRef.current = null;
      setDragValue(null);
      onCommit(committed);
    }
  };
  const onPointerUp = () => finishDrag();
  const onPointerCancel = () => finishDrag();

  // 键盘可达性
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (busy || !online) return;
      let next: number | null = null;
      const cur = value ?? 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(cur + 1, 0, 100);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(cur - 1, 0, 100);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      else if (e.key === 'PageUp') next = clamp(cur + 10, 0, 100);
      else if (e.key === 'PageDown') next = clamp(cur - 10, 0, 100);
      if (next !== null) {
        e.preventDefault();
        onCommit(next);
      }
    };
    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, [value, busy, online, onCommit]);

  // 颜色从冷蓝到暖橙渐变
  const stopA = '#3b82f6'; // blue-500
  const stopB = '#06b6d4'; // cyan-500
  const stopC = '#f59e0b'; // amber-500
  const stopD = '#ef4444'; // red-500

  return (
    <div className="select-none">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="slider"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? 0}
        aria-disabled={busy || !online}
        tabIndex={0}
        className={`touch-none outline-none ${
          busy ? 'cursor-wait' : 'cursor-pointer'
        } focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded-full`}
        style={{ filter: !online ? 'grayscale(0.6) opacity(0.7)' : undefined }}
      >
        <defs>
          <linearGradient id="dialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stopA} />
            <stop offset="40%" stopColor={stopB} />
            <stop offset="75%" stopColor={stopC} />
            <stop offset="100%" stopColor={stopD} />
          </linearGradient>
          <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* 背景轨道 */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* 进度弧 */}
        <path
          d={progressPath}
          fill="none"
          stroke="url(#dialGrad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          style={{
            transition: isDragging ? 'none' : 'stroke-dashoffset 200ms ease',
          }}
        />

        {/* 刻度（每 10%） */}
        {Array.from({ length: 11 }).map((_, i) => {
          const a = MIN_ANGLE + (i / 10) * SWEEP;
          const inner = polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 6, a);
          const outer = polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 1, a);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#9ca3af"
              strokeWidth={i % 5 === 0 ? 2 : 1}
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })}

        {/* 拇指 */}
        <circle
          cx={thumb.x}
          cy={thumb.y}
          r={STROKE * 0.85}
          fill="white"
          stroke="url(#dialGrad)"
          strokeWidth={3}
          filter="url(#dialShadow)"
          style={{ transition: isDragging ? 'none' : 'cx 200ms ease, cy 200ms ease' }}
        />

        {/* 中心文字 */}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          className="fill-gray-900"
          style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}
        >
          {value === null && !isDragging ? '—' : safePercent}
          <tspan
            style={{ fontSize: 22, fontWeight: 500 }}
            className="fill-gray-500"
            dx={2}
          >
            %
          </tspan>
        </text>
        <text
          x={CENTER}
          y={CENTER + 28}
          textAnchor="middle"
          className="fill-gray-500"
          style={{ fontSize: 13, letterSpacing: 1 }}
        >
          {caption}
        </text>

        {/* 0% / 100% 刻度文字 */}
        <text
          x={polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 22, MIN_ANGLE).x}
          y={polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 22, MIN_ANGLE).y + 4}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: 11 }}
        >
          0
        </text>
        <text
          x={polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 22, MAX_ANGLE).x}
          y={polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 22, MAX_ANGLE).y + 4}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: 11 }}
        >
          100
        </text>
      </svg>
    </div>
  );
};

export default FanSpeedDial;
