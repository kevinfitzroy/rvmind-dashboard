import React, { useState } from 'react';
import { Droplets, Wifi, WifiOff, Power, PowerOff, Loader2 } from 'lucide-react';
import { WaterTankSensorData } from '../../services/sensor';

interface WaterTankIndicatorProps {
  tank: WaterTankSensorData;
}

const WaterTankIndicator: React.FC<WaterTankIndicatorProps> = ({ tank }) => {
  const fillPercentage = tank.levelPercentage;
  
  // 水泵状态管理 - 清水箱默认开启，黑水箱默认关闭
  const [pumpStatus, setPumpStatus] = useState({
    enabled: tank.id === 'fresh-water', // 清水箱默认开启
    loading: false
  });

  const getStatusColor = () => {
    if (tank.id === 'fresh-water') {
      // 清水箱：越满越好
      if (fillPercentage > 70) return 'text-green-600';
      if (fillPercentage > 30) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // 黑水箱：越满越危险
      if (fillPercentage > 80) return 'text-red-600';
      if (fillPercentage > 50) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const getFillColor = () => {
    if (tank.id === 'fresh-water') {
      // 清水箱：蓝色系
      if (fillPercentage > 70) return 'bg-gradient-to-t from-blue-400 to-blue-300';
      if (fillPercentage > 30) return 'bg-gradient-to-t from-blue-300 to-blue-200';
      return 'bg-gradient-to-t from-blue-200 to-blue-100';
    } else {
      // 黑水箱：根据容量变色
      if (fillPercentage > 80) return 'bg-gradient-to-t from-red-400 to-red-300';
      if (fillPercentage > 50) return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
      return 'bg-gradient-to-t from-gray-400 to-gray-300';
    }
  };

  // 水泵控制
  const handlePumpToggle = async () => {
    if (pumpStatus.loading) return;
    
    setPumpStatus(prev => ({ ...prev, loading: true }));
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPumpStatus(prev => ({ 
        enabled: !prev.enabled, 
        loading: false 
      }));
    } catch (err) {
      console.error('Failed to control pump:', err);
    } finally {
      setPumpStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // 获取水泵类型文案
  const getPumpLabel = () => {
    return tank.id === 'fresh-water' ? '增压泵' : '灰/黑水箱排污泵';
  };

  return (
    <div className="bg-white/70 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow duration-200 max-w-[200px] mx-auto">
      <div className="text-center mb-3">
        <div className="flex items-center justify-center space-x-1 mb-1">
          <h4 className="text-xs font-semibold text-gray-800">{tank.name}</h4>
          {tank.isFresh ? (
            <Wifi className="w-2 h-2 text-green-500" />
          ) : (
            <WifiOff className="w-2 h-2 text-red-500" />
          )}
        </div>
        <p className="text-xs text-gray-600">{tank.location}</p>
      </div>

      <div className="relative w-full h-16 bg-gray-200 rounded overflow-hidden mb-3">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getFillColor()}`}
          style={{ height: `${Math.min(fillPercentage, 100)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700 bg-white/80 px-1 py-0.5 rounded">
            {Math.round(fillPercentage)}%
          </span>
        </div>
      </div>

      <div className="text-center space-y-1 mb-3">
        <p className="text-xs text-gray-600">
          容量: {tank.capacity}L
        </p>
        <p className={`text-xs font-medium ${getStatusColor()}`}>
          {tank.status}
        </p>
        {/* 原始值显示 - 较小且不显眼 */}
        <p className="text-xs text-gray-400">
          原始值: {tank.currentLevel.toFixed(1)}
        </p>
      </div>

      {/* 水泵控制按钮 */}
      <div className="border-t border-gray-200 pt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{getPumpLabel()}</span>
          <div className={`text-xs ${pumpStatus.enabled ? 'text-green-600' : 'text-gray-500'}`}>
            {pumpStatus.enabled ? '运行中' : '停止'}
          </div>
        </div>
        
        <button
          onClick={handlePumpToggle}
          disabled={pumpStatus.loading}
          className={`
            w-full flex items-center justify-center space-x-1 px-2 py-1 rounded text-white text-xs font-medium
            transition-colors duration-200
            ${pumpStatus.enabled 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${pumpStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {pumpStatus.loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>处理中</span>
            </>
          ) : pumpStatus.enabled ? (
            <>
              <PowerOff className="w-3 h-3" />
              <span>停止</span>
            </>
          ) : (
            <>
              <Power className="w-3 h-3" />
              <span>启动</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WaterTankIndicator;