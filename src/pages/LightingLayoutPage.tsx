import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  toggleButton,
  getAllButtonStates,
  subscribeToDeviceStatusChanges,
} from '../services/api';

const SCALE = 65;
const SHEAR_X = 0.22;
const SHEAR_Y = 0.5;
const Z_SCALE = 44;
const OX = 80;
const OY = 290;
const CEILING_Z = 2.5;

type Pt = [number, number];

function p(x: number, y: number, z = 0): Pt {
  return [
    OX + (x - y * SHEAR_X) * SCALE,
    OY - y * SHEAR_Y * SCALE - z * Z_SCALE,
  ];
}

function pts(...arr: Pt[]): string {
  return arr.map(([a, b]) => `${a},${b}`).join(' ');
}

interface BoxProps {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  zBase?: number;
  topFill: string;
  sideFill?: string;
  stroke?: string;
  label?: string;
  labelFill?: string;
  showFront?: boolean;
  showRight?: boolean;
  opacity?: number;
}

const Box: React.FC<BoxProps> = ({
  x, y, w, d, h,
  zBase = 0,
  topFill,
  sideFill,
  stroke = '#0f172a',
  label,
  labelFill = '#f1f5f9',
  showFront = true,
  showRight = true,
  opacity = 1,
}) => {
  const side = sideFill ?? topFill;
  const z0 = zBase;
  const z1 = zBase + h;
  const A = p(x, y, z0);
  const B = p(x + w, y, z0);
  const C = p(x + w, y + d, z0);
  const a = p(x, y, z1);
  const b = p(x + w, y, z1);
  const c = p(x + w, y + d, z1);
  const d2 = p(x, y + d, z1);
  return (
    <g opacity={opacity}>
      {showFront && (
        <polygon points={pts(A, B, b, a)} fill={side} stroke={stroke} strokeWidth={0.6} />
      )}
      {showRight && (
        <polygon points={pts(B, C, c, b)} fill={side} stroke={stroke} strokeWidth={0.6} />
      )}
      <polygon points={pts(a, b, c, d2)} fill={topFill} stroke={stroke} strokeWidth={0.8} />
      {label && (
        <text
          x={(a[0] + c[0]) / 2}
          y={(a[1] + c[1]) / 2 + 3}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={labelFill}
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

interface LightDef {
  id: string;
  label: string;
  buttonIds: string[];
  x: number;
  y: number;
  z: number;
}

const LIGHTS: LightDef[] = [
  { id: 'bed_light1',     label: '前床灯',   buttonIds: ['bed_light1'],                       x: 0.75, y: 1.25, z: 2.05 },
  { id: 'inner_light23',  label: '顶灯2/3',  buttonIds: ['inner_light2', 'inner_light3'],     x: 3.25, y: 0.85, z: 2.30 },
  { id: 'washroom_light', label: '卫生间灯', buttonIds: ['washroom_light'],                   x: 3.25, y: 2.20, z: 1.95 },
  { id: 'inner_light1',   label: '顶灯1',    buttonIds: ['inner_light1'],                     x: 4.25, y: 1.25, z: 2.30 },
  { id: 'bed2_light',     label: '后床灯',   buttonIds: ['bed2_light'],                       x: 5.25, y: 1.25, z: 2.05 },
];

const BODY_CORNERS: Array<[number, number]> = [
  [0.4, 0],
  [0.0, 0.35],
  [0.0, 2.15],
  [0.4, 2.5],
  [5.95, 2.5],
  [6.0, 2.4],
  [6.0, 0.1],
  [5.95, 0],
];

function bodyAtZ(z: number): Pt[] {
  return BODY_CORNERS.map(([x, y]) => p(x, y, z));
}

const LightingLayoutPage: React.FC = () => {
  const [states, setStates] = useState<Record<string, boolean>>({});
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const refresh = () => {
      const all = getAllButtonStates();
      const s: Record<string, boolean> = {};
      const o: Record<string, boolean> = {};
      LIGHTS.forEach(({ id, buttonIds }) => {
        s[id] = buttonIds.some(bid => !!all[bid]?.state);
        o[id] = buttonIds.every(bid => !!all[bid]?.isOnline);
      });
      setStates(s);
      setOnline(o);
    };
    refresh();
    return subscribeToDeviceStatusChanges(refresh);
  }, []);

  const handleToggle = async (id: string) => {
    if (pending[id]) return;
    const light = LIGHTS.find(l => l.id === id);
    if (!light) return;
    setPending(prev => ({ ...prev, [id]: true }));
    const next = !states[id];
    setStates(s => ({ ...s, [id]: next }));
    try {
      await Promise.all(light.buttonIds.map(bid => toggleButton(bid, next)));
    } catch (err) {
      console.error('toggle failed', err);
      setStates(s => ({ ...s, [id]: !next }));
    } finally {
      setTimeout(() => setPending(prev => ({ ...prev, [id]: false })), 800);
    }
  };

  const floorPts = bodyAtZ(0);
  const roofPts = bodyAtZ(CEILING_Z);
  const frontLabelPos = p(-0.05, 1.25, 0);
  const rearLabelPos = p(6.05, 1.25, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" />返回
        </Link>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">房车灯光控制</h2>

      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl shadow-xl p-4 sm:p-6">
        <svg
          viewBox="0 0 560 400"
          className="w-full"
          style={{ touchAction: 'manipulation' }}
        >
          <defs>
            <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bedSlabGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="acGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* ── chassis hint: wheels ── */}
          {[0.95, 5.0].map((wx) =>
            [0, 2.5].map((wy) => {
              const [cx, cy] = p(wx, wy, 0);
              return (
                <ellipse
                  key={`${wx}-${wy}`}
                  cx={cx}
                  cy={cy + 4}
                  rx={14}
                  ry={5}
                  fill="#0f172a"
                  opacity={0.5}
                />
              );
            }),
          )}

          {/* ── floor ── */}
          <polygon
            points={pts(...floorPts)}
            fill="url(#floorGrad)"
            stroke="#f8fafc"
            strokeWidth={1.5}
          />

          {/* ── section dividers ── */}
          {[1.5, 2.5, 4.0, 4.5].map((dx) => {
            const a = p(dx, 0.05, 0);
            const b = p(dx, 2.45, 0);
            return (
              <line
                key={dx}
                x1={a[0]} y1={a[1]}
                x2={b[0]} y2={b[1]}
                stroke="#94a3b8"
                strokeWidth={0.8}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            );
          })}

          {/* ─────────  LOW LAYER (X.1)  ───────── */}
          {/* Far row */}
          <Box x={0.05} y={1.65} w={0.85} d={0.7} h={0.5}
            topFill="#1e293b" sideFill="#0f172a" label="副驾" labelFill="#cbd5e1" />
          <Box x={2.5} y={1.7} w={1.5} d={0.75} h={2.0}
            topFill="#0e7490" sideFill="#155e75" label="卫生间" opacity={0.45} />
          <Box x={4.0} y={1.75} w={0.5} d={0.7} h={2.0}
            topFill="#374151" sideFill="#1f2937" label="衣柜" />

          {/* Mid (full width across y) */}
          <Box x={1.5} y={0.15} w={1.0} d={2.2} h={0.3}
            topFill="#64748b" sideFill="#475569" label="中间床" />
          <Box x={4.5} y={0.15} w={1.4} d={2.2} h={0.5}
            topFill="#92400e" sideFill="#7c2d12" label="沙发" />

          {/* Near row */}
          <Box x={0.05} y={0.15} w={0.85} d={0.7} h={0.5}
            topFill="#1e293b" sideFill="#0f172a" label="驾驶" labelFill="#cbd5e1" />
          <Box x={2.5} y={0.05} w={1.5} d={0.65} h={0.85}
            topFill="#a16207" sideFill="#713f12" label="厨房" />
          <Box x={4.0} y={0.05} w={0.5} d={0.65} h={1.65}
            topFill="#1e3a8a" sideFill="#1e40af" label="冰箱" />

          {/* ─────────  HIGH LAYER (X.2)  ───────── */}
          {/* Front bed slab — overhead bed above the cab */}
          <Box x={0.0} y={0.15} w={1.5} d={2.2} h={0.3} zBase={1.55}
            topFill="url(#bedSlabGrad)" sideFill="#6d28d9"
            opacity={0.65} />
          {(() => {
            const [lx, ly] = p(0.4, 0.4, 1.85);
            return (
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11}
                fontWeight={700} fill="#f5f3ff" style={{ pointerEvents: 'none' }}>
                前床
              </text>
            );
          })()}
          {/* Rear bed slab — overhead bed above the sofa */}
          <Box x={4.5} y={0.15} w={1.45} d={2.2} h={0.3} zBase={1.55}
            topFill="url(#bedSlabGrad)" sideFill="#6d28d9"
            opacity={0.65} />
          {(() => {
            const [lx, ly] = p(4.85, 0.4, 1.85);
            return (
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11}
                fontWeight={700} fill="#f5f3ff" style={{ pointerEvents: 'none' }}>
                后床
              </text>
            );
          })()}
          {/* AC unit on roof above section 2 */}
          <Box x={1.7} y={0.85} w={0.6} d={0.8} h={0.25} zBase={2.35}
            topFill="url(#acGrad)" sideFill="#94a3b8" label="空调" labelFill="#1e293b" />

          {/* ─────────  CABIN ENVELOPE (translucent wireframe)  ───────── */}
          {floorPts.map((fp, i) => (
            <line
              key={`vedge-${i}`}
              x1={fp[0]} y1={fp[1]}
              x2={roofPts[i][0]} y2={roofPts[i][1]}
              stroke="rgba(248,250,252,0.22)"
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />
          ))}
          <polygon
            points={pts(...roofPts)}
            fill="none"
            stroke="rgba(248,250,252,0.4)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          {/* Windshield hint: front floor-corner to roof-corner with subtle solid line */}
          {[0, 1].map((i) => (
            <line
              key={`ws-${i}`}
              x1={floorPts[i][0]} y1={floorPts[i][1]}
              x2={roofPts[i][0]} y2={roofPts[i][1]}
              stroke="rgba(186,230,253,0.55)"
              strokeWidth={1.3}
            />
          ))}

          {/* ── orientation labels ── */}
          <text
            x={frontLabelPos[0] - 30} y={frontLabelPos[1] + 5}
            fontSize={11} fontWeight={700} fill="#94a3b8"
          >◀ 前</text>
          <text
            x={rearLabelPos[0] + 8} y={rearLabelPos[1] + 5}
            fontSize={11} fontWeight={700} fill="#94a3b8"
          >后 ▶</text>

          {/* ─────────  LIGHTS (drawn last)  ───────── */}
          {LIGHTS.map((light) => {
            const isOn = states[light.id];
            const isPending = pending[light.id];
            const isOffline = !online[light.id];
            const [cx, cy] = p(light.x, light.y, light.z);
            const [bx, by] = p(light.x, light.y, 0);
            return (
              <g
                key={light.id}
                onClick={() => handleToggle(light.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Floor pool of light */}
                {isOn && (
                  <ellipse
                    cx={bx} cy={by}
                    rx={20} ry={11}
                    fill="#fbbf24"
                    opacity={0.18}
                    pointerEvents="none"
                  />
                )}
                {/* Drop line ceiling → floor */}
                <line
                  x1={cx} y1={cy} x2={bx} y2={by}
                  stroke={isOn ? '#fbbf24' : '#64748b'}
                  strokeWidth={0.6}
                  strokeDasharray="2 3"
                  opacity={isOn ? 0.55 : 0.3}
                  pointerEvents="none"
                />
                {/* Glow halo */}
                {isOn && (
                  <circle cx={cx} cy={cy} r={32} fill="url(#lightGlow)" pointerEvents="none" />
                )}
                {/* Hit target */}
                <circle cx={cx} cy={cy} r={22} fill="transparent" />
                {/* Bulb body */}
                <circle
                  cx={cx} cy={cy} r={11}
                  fill={isOn ? '#fef3c7' : '#1e293b'}
                  stroke={isOn ? '#fbbf24' : '#64748b'}
                  strokeWidth={isOn ? 2.5 : 1.5}
                  opacity={isOffline ? 0.45 : 1}
                />
                <circle
                  cx={cx} cy={cy} r={4}
                  fill={isOn ? '#f59e0b' : '#475569'}
                  pointerEvents="none"
                />
                {isPending && (
                  <circle
                    cx={cx} cy={cy} r={16}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1.8}
                    strokeDasharray="3 4"
                    pointerEvents="none"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${cx} ${cy}`}
                      to={`360 ${cx} ${cy}`}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <text
                  x={cx} y={cy - 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={isOn ? '#fde68a' : '#cbd5e1'}
                  style={{ pointerEvents: 'none' }}
                >
                  {light.label}
                  {isOffline ? ' (离线)' : ''}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend / quick toggles */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LIGHTS.map((light) => {
            const isOn = states[light.id];
            const isOffline = !online[light.id];
            const isPending = pending[light.id];
            return (
              <button
                key={light.id}
                onClick={() => handleToggle(light.id)}
                disabled={isPending || isOffline}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-left ${
                  isOn
                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                    : 'bg-slate-700/40 border-slate-600 text-slate-100 hover:bg-slate-700/70'
                } ${isOffline ? 'opacity-50 cursor-not-allowed' : ''} ${
                  isPending ? 'opacity-60 cursor-wait' : ''
                }`}
              >
                <span className="text-sm font-medium">{light.label}</span>
                <span className="text-xs">
                  {isOffline ? '离线' : isOn ? '开' : '关'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          双层立体布局：低层为驾驶/家具，高层为前床、空调与吊顶灯。点击图中灯点或下方按钮切换。
        </p>
      </div>
    </div>
  );
};

export default LightingLayoutPage;
