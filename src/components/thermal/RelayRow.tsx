import React from 'react';

interface RelayRowProps {
  icon: React.ReactNode;
  title: string;
  onLabel: string;
  offLabel: string;
  description: string;
  onState: boolean;
  stale: boolean;
  disabled: boolean;
  onToggle: () => void;
}

const RelayRow: React.FC<RelayRowProps> = ({
  icon,
  title,
  onLabel,
  offLabel,
  description,
  onState,
  stale,
  disabled,
  onToggle,
}) => (
  <div className="flex items-start gap-3 px-4 py-3">
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <span
          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
            onState
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-200 text-gray-600'
          } ${stale ? 'opacity-60' : ''}`}
        >
          {onState ? onLabel : offLabel}
        </span>
      </div>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
    </div>
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        onState ? 'bg-emerald-500' : 'bg-gray-300'
      } disabled:opacity-50`}
      aria-label={`切换 ${title}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          onState ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default RelayRow;
