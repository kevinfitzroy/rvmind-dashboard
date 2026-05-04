import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  description?: string;
  /** 折叠态（也始终显示）的核心摘要 */
  summary?: React.ReactNode;
  /** 右侧状态徽章 */
  badge?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  icon,
  iconBg = 'bg-gray-50',
  title,
  description,
  summary,
  badge,
  defaultExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-gray-50/60 transition-colors"
        aria-expanded={expanded}
      >
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </span>
          </div>
          {summary !== undefined && (
            <div className="mt-0.5 text-xs text-gray-500 truncate">
              {summary}
            </div>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
        <ChevronDown
          className={`flex-shrink-0 w-5 h-5 text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {description && (
            <p className="px-5 sm:px-6 pt-4 text-sm text-gray-500">
              {description}
            </p>
          )}
          <div className="px-5 sm:px-6 py-5">{children}</div>
        </div>
      )}
    </section>
  );
};

export default CollapsibleSection;
