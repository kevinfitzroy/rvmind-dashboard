import React from 'react';
import { ArrowLeft, ChevronRight, Cpu, Flame, Server, Settings as SettingsIcon, SlidersHorizontal } from 'lucide-react';
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

        <SettingSection
          title="高级控制"
          description="完整设备控制台，含调试与高阶参数"
          icon={SlidersHorizontal}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        >
          <SettingItem
            label="柴油加热器（高级）"
            description="完整控制台：手动 1Hz 帧、温控阈值、补水循环、控制端口连接管理等。日常调节请用热控中心。"
            action={
              <button
                onClick={() => navigate('/settings/diesel-heater')}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Flame className="w-4 h-4" />
                打开
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />
        </SettingSection>

        <SettingSection
          title="底层设备调试"
          description="直接访问设备寄存器，仅供排障使用"
          icon={Cpu}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        >
          <SettingItem
            label="调速器寄存器调试"
            description="读写调速器（设备号 0x1F）的电压百分比与 PWM 频率寄存器。日常使用请前往热控中心。"
            action={
              <button
                onClick={() => navigate('/settings/speed-controller')}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                打开
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />
        </SettingSection>

        {/* 后续可在此追加更多分组，例如：网络配置、通知、显示偏好、关于等。 */}
      </div>
    </div>
  );
};

export default SettingsPage;
