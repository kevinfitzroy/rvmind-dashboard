import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle, Battery, Zap, Thermometer, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getPmsData,
  subscribeToPmsDataChanges,
  isPmsDataReady,
  refreshPmsData,
  PMS_RawCanFrames,
  PMS_Status,
  BMS_FaultLevel,
  BMS_Status01,
  BMS_Status02,
  BMS_FaultInfo,
  DCAC_Status,
  RCU_Status01
} from '../services/batteryApi';

const MainBatteryDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState<PMS_RawCanFrames | null>(null);
  const [statusData, setStatusData] = useState<PMS_Status | null>(null);
  const [isStale, setIsStale] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // 更新数据的函数
    const updateData = () => {
      const { raw, status, isStale } = getPmsData();
      setRawData(raw);
      setStatusData(status);
      setIsStale(isStale);
      setLastUpdate(new Date());
    };

    // 初始加载
    updateData();

    // 订阅数据变化
    const unsubscribe = subscribeToPmsDataChanges(() => {
      updateData();
    });

    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPmsData();
    } catch (error) {
      console.error('Failed to refresh PMS data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getFaultLevelColor = (level: BMS_FaultLevel) => {
    switch (level) {
      case BMS_FaultLevel.NO_FAULT: return 'text-green-600';
      case BMS_FaultLevel.LEVEL_1: return 'text-yellow-600';
      case BMS_FaultLevel.LEVEL_2: return 'text-orange-600';
      case BMS_FaultLevel.LEVEL_3: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getFaultLevelText = (level: BMS_FaultLevel) => {
    switch (level) {
      case BMS_FaultLevel.NO_FAULT: return '无故障';
      case BMS_FaultLevel.LEVEL_1: return '一级故障';
      case BMS_FaultLevel.LEVEL_2: return '二级故障';
      case BMS_FaultLevel.LEVEL_3: return '三级故障';
      default: return '未知';
    }
  };

  // BMS状态信息01组件
  const BMSStatus01Card: React.FC<{ data: BMS_Status01 }> = ({ data }) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center mb-4">
        <Battery className="w-5 h-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">BMS状态信息01</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">SOC电量</label>
            <div className="text-2xl font-bold text-blue-600">{data.soc}%</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">输出电压</label>
            <div className="text-lg font-semibold">{data.volOutputBMS.toFixed(2)} V</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">输出电流</label>
            <div className="text-lg font-semibold">{data.curOutputBMS.toFixed(2)} A</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">充满电所需电量</label>
            <div className="text-lg font-semibold">{data.capChg2Full.toFixed(1)} Ah</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">高压上下电允许</label>
            <div className="text-sm">{['禁止上高压', '允许上高压', '请求下高压', '保留'][data.hvPowerAllow] || '未知'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">高压回路状态</label>
            <div className="text-sm">{['高压回路未闭合', '高压回路闭合'][data.hvPowerLoopStatus] || '未知'}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          更新时间: {formatTimestamp(data.timestamp)}
        </div>
      </div>
    </div>
  );

  // BMS状态信息02组件
  const BMSStatus02Card: React.FC<{ data: BMS_Status02 }> = ({ data }) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center mb-4">
        <Zap className="w-5 h-5 text-green-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">BMS状态信息02</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">正极绝缘电阻</label>
            <div className="text-lg font-semibold">{data.insResPos.toFixed(0)} kΩ</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">负极绝缘电阻</label>
            <div className="text-lg font-semibold">{data.insResNeg.toFixed(0)} kΩ</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">电池健康度(SOH)</label>
            <div className="text-lg font-semibold text-green-600">{data.soh}%</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">正极继电器</label>
            <div className="text-sm">{['继电器断开', '继电器闭合'][data.posRelayStatus] || '未知'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">负极继电器</label>
            <div className="text-sm">{['继电器断开', '继电器闭合'][data.negRelayStatus] || '未知'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">预充继电器</label>
            <div className="text-sm">{['继电器断开', '继电器闭合'][data.prechgRelayStatus] || '未知'}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          更新时间: {formatTimestamp(data.timestamp)}
        </div>
      </div>
    </div>
  );

  // BMS故障信息组件
  const BMSFaultInfoCard: React.FC<{ data: BMS_FaultInfo }> = ({ data }) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">BMS故障信息</h3>
      </div>
      
      <div className="mb-4">
        <label className="text-sm text-gray-600">故障等级</label>
        <div className={`text-xl font-bold ${getFaultLevelColor(data.faultLevel)}`}>
          {getFaultLevelText(data.faultLevel)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>CAN通信故障:</span>
            <span className={data.canComFault ? 'text-red-600' : 'text-green-600'}>
              {data.canComFault ? '有故障' : '正常'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>主继电器粘连:</span>
            <span className={data.mainRelayCutoffFault ? 'text-red-600' : 'text-green-600'}>
              {data.mainRelayCutoffFault ? '有故障' : '正常'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>主回路断路:</span>
            <span className={data.mainLoopBreakFault ? 'text-red-600' : 'text-green-600'}>
              {data.mainLoopBreakFault ? '有故障' : '正常'}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>预充失败:</span>
            <span className={data.prechgFailFault ? 'text-red-600' : 'text-green-600'}>
              {data.prechgFailFault ? '有故障' : '正常'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>温度传感器:</span>
            <span className={data.tempSensorFault ? 'text-red-600' : 'text-green-600'}>
              {data.tempSensorFault ? '有故障' : '正常'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>电压传感器:</span>
            <span className={data.volSensorFault ? 'text-red-600' : 'text-green-600'}>
              {data.volSensorFault ? '有故障' : '正常'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          更新时间: {formatTimestamp(data.timestamp)}
        </div>
      </div>
    </div>
  );

  // DCAC状态组件
  const DCACStatusCard: React.FC<{ data: DCAC_Status }> = ({ data }) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center mb-4">
        <Activity className="w-5 h-5 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">DCAC状态</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">系统状态</label>
            <div className="text-lg font-semibold">
              {['', 'SENSORCHECK', 'RUN', 'ERROR'][data.sysStatus] || '未知'}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">手动开关</label>
            <div className="text-sm">{data.handSwitch ? '断开' : '接通'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">模块温度</label>
            <div className="text-lg font-semibold">{data.tempModule} ℃</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">继电器1</label>
            <div className="text-sm">{['关闭', '打开'][data.relay1] || '未知'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">继电器2</label>
            <div className="text-sm">{['关闭', '打开'][data.relay2] || '未知'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">光耦1</label>
            <div className="text-sm">{['打开', '关闭'][data.opt1] || '未知'}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          更新时间: {formatTimestamp(data.timestamp)}
        </div>
      </div>
    </div>
  );

  // RCU状态组件
  const RCUStatus01Card: React.FC<{ data: RCU_Status01 }> = ({ data }) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center mb-4">
        <Thermometer className="w-5 h-5 text-orange-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">RCU状态01</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">ISG发电机转矩</label>
            <div className="text-lg font-semibold">{data.isgTor.toFixed(1)} N.m</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">ISG发电机转速</label>
            <div className="text-lg font-semibold">{data.isgSpeed} Rpm</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">直流母线输出电流</label>
            <div className="text-lg font-semibold">{data.isgCurOutput.toFixed(1)} A</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">发电状态</label>
            <div className="text-sm">{['关闭发电', '待机状态', '发电运行中'][data.systemStatus] || '未知'}</div>
          </div>
        </div>
      </div>
      
      {data.faultInfo > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            故障码: {data.faultInfo}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          更新时间: {formatTimestamp(data.timestamp)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              返回
            </button>
            <h1 className="text-3xl font-bold text-gray-800">主电池系统详情</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {lastUpdate && (
                <span>最后更新: {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              isStale ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isStale ? '数据过时' : '数据新鲜'}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新数据
            </button>
          </div>
        </div>

        {/* 系统概览 */}
        {statusData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">SOC电量</p>
                  <p className="text-2xl font-bold text-blue-600">{statusData.bms.soc}%</p>
                </div>
                <Battery className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">电压</p>
                  <p className="text-2xl font-bold text-green-600">{statusData.bms.voltage.toFixed(2)}V</p>
                </div>
                <Zap className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">电流</p>
                  <p className="text-2xl font-bold text-purple-600">{statusData.bms.current.toFixed(2)}A</p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">故障等级</p>
                  <p className={`text-2xl font-bold ${getFaultLevelColor(statusData.bms.faultLevel)}`}>
                    {getFaultLevelText(statusData.bms.faultLevel)}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        )}

        {/* 详细数据卡片 */}
        {rawData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rawData.BMS_Status01 && <BMSStatus01Card data={rawData.BMS_Status01} />}
            {rawData.BMS_Status02 && <BMSStatus02Card data={rawData.BMS_Status02} />}
            {rawData.BMS_FaultInfo && <BMSFaultInfoCard data={rawData.BMS_FaultInfo} />}
            {rawData.DCAC_Status && <DCACStatusCard data={rawData.DCAC_Status} />}
            {rawData.RCU_Status01 && <RCUStatus01Card data={rawData.RCU_Status01} />}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载数据中...</p>
            </div>
          </div>
        )}

        {/* 数据状态说明 */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">数据说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p>• PMS数据每秒刷新一次</p>
              <p>• BMS状态信息包含电池核心参数</p>
              <p>• 故障信息实时监控系统安全状态</p>
            </div>
            <div>
              <p>• DCAC系统控制交流输出</p>
              <p>• RCU管理发电机状态</p>
              <p>• 数据来源于CAN总线实时通信</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainBatteryDetailPage;
