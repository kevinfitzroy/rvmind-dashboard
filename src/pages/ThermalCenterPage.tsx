import React from 'react';
import { ArrowLeft, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FanSpeedSection from '../components/thermal/FanSpeedSection';
import DieselHeaterSection from '../components/thermal/DieselHeaterSection';
import VentilationSection from '../components/thermal/VentilationSection';

const ThermalCenterPage: React.FC = () => {
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
          <Wind className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">热控中心</h1>
        </div>
      </div>

      <div className="max-w-3xl space-y-3">
        <FanSpeedSection />
        <DieselHeaterSection />
        <VentilationSection />
      </div>
    </div>
  );
};

export default ThermalCenterPage;
