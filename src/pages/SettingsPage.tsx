import React from 'react';
import { ArrowLeft, Server, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingSection from '../components/settings/SettingSection';
import SettingItem from '../components/settings/SettingItem';
import RestartServerAction from '../components/settings/RestartServerAction';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

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
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        </div>
      </div>

      <div className="space-y-5 max-w-3xl">
        <SettingSection
          title="系统管理"
          description="后端服务的运行控制"
          icon={Server}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        >
          <SettingItem
            label="重启服务器"
            description="当 CAN（主电池 / 柴油加热器）出现长时间无数据时，重启服务器通常可恢复通信。"
            action={<RestartServerAction />}
          />
        </SettingSection>

        {/* 后续可在此追加更多分组，例如：网络配置、通知、显示偏好、关于等。 */}
      </div>
    </div>
  );
};

export default SettingsPage;
