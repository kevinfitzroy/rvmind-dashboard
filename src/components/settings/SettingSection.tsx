import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  children,
}) => {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <header className="flex items-start gap-4 px-6 py-5 border-b border-gray-100">
        <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="divide-y divide-gray-100">
        {children}
      </div>
    </section>
  );
};

export default SettingSection;
