import React from 'react';

interface SettingItemProps {
  label: string;
  description?: string;
  action: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, action }) => {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
};

export default SettingItem;
