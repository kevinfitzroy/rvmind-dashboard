import {api} from './apiConfig'

// PMS 数据类型定义 (参考 battery.service.ts)
export enum BMS_HVPowerAllow {
    FORBID_HIGH_VOLTAGE = 0,
    ALLOW_HIGH_VOLTAGE = 1,
    REQUEST_POWER_DOWN = 2,
    RESERVED = 3
}

export enum BMS_HVPowerLoopStatus {
    NOT_CLOSED = 0,
    CLOSED = 1
}

export enum BMS_HeatingRequest {
    FORBID_HEATING = 0,
    REQUEST_HEATING = 1
}

export enum BMS_HVRelayStatus {
    RELAY_OPEN = 0,
    RELAY_CLOSED = 1
}

export enum VCU_EnableDCAC {
    DISABLE = 0,
    ENABLE = 1
}

export enum VCU_EnablePWM {
    ENABLE_PWM = 0,
    DISABLE_PWM = 1
}

export enum DCAC_TaskState {
    SENSORCHECK = 1,
    RUN = 2,
    ERROR = 3
}

export enum DCAC_RELAY1 {
    RELAY1_CLOSE = 0,
    RELAY1_OPEN = 1
}

export enum DCAC_RELAY2 {
    RELAY2_CLOSE = 0,
    RELAY2_OPEN = 1
}

export enum DCAC_OPT1 {
    OPT1_OPEN = 0,
    OPT1_CLOSE = 1
}

export enum DCAC_OPT2 {
    OPT2_OPEN = 0,
    OPT2_CLOSE = 1
}

export enum ISG_ChargeEnable {
    DISABLE = 0,
    ENABLE = 1
}

export enum ISG_ChgPos_ConState {
    DISCONNECT = 0,
    CONNECT = 1
}

export enum ISG_System_Status {
    POWER_OFF = 0,
    STANDBY = 1,
    GENERATING = 2
}

export enum BMS_FaultLevel {
    NO_FAULT = 0,
    LEVEL_1 = 1,
    LEVEL_2 = 2,
    LEVEL_3 = 3
}

export enum BMS_FaultStatus {
    NO_FAULT = 0,
    HAS_FAULT = 1
}

// BMS 状态信息类型
export interface BMS_Status01 {
    hvPowerAllow: BMS_HVPowerAllow;
    hvPowerLoopStatus: BMS_HVPowerLoopStatus;
    heatingRequest: BMS_HeatingRequest;
    coolingRequest: number;
    dcChgStatus: number;
    volOutputBMS: number;
    curOutputBMS: number;
    capChg2Full: number;
    soc: number;
    timestamp: number;
}

export interface BMS_Status02 {
    insResPos: number;
    insResNeg: number;
    posRelayStatus: BMS_HVRelayStatus;
    negRelayStatus: BMS_HVRelayStatus;
    prechgRelayStatus: BMS_HVRelayStatus;
    dcChgRelayStatus: number;
    heatingRelayStatus: number;
    batteryChargingStatus: number;
    socMinCanUse: number;
    soh: number;
    timestamp: number;
}

export interface BMS_FaultInfo {
    faultLevel: BMS_FaultLevel;
    socLessThan20: BMS_FaultStatus;
    dischgCurGreaterL2: BMS_FaultStatus;
    cellVolDiffGreaterL1: BMS_FaultStatus;
    tempDiffGreaterL1: BMS_FaultStatus;
    insResLessThan800: BMS_FaultStatus;
    tempGreaterL2: BMS_FaultStatus;
    tempLessL3: BMS_FaultStatus;
    cellVolGreaterL1: BMS_FaultStatus;
    cellVolLessL1: BMS_FaultStatus;
    dischgCurGreaterL3: BMS_FaultStatus;
    socLessThan10: BMS_FaultStatus;
    cellVolDiffGreaterL2: BMS_FaultStatus;
    tempDiffGreaterL2: BMS_FaultStatus;
    insResLessThan500: BMS_FaultStatus;
    tempGreaterL3: BMS_FaultStatus;
    volGreaterL3: BMS_FaultStatus;
    volLessL3: BMS_FaultStatus;
    dischgCurGreaterL1: BMS_FaultStatus;
    cellVolGreaterL2: BMS_FaultStatus;
    cellVolLessL2: BMS_FaultStatus;
    insResLessThan100: BMS_FaultStatus;
    cellVolDiffGreaterL3: BMS_FaultStatus;
    tempSensorFault: BMS_FaultStatus;
    volSensorFault: BMS_FaultStatus;
    innerCANFault: BMS_FaultStatus;
    cellVolGreaterL3: BMS_FaultStatus;
    cellVolLessL3: BMS_FaultStatus;
    socStepChange: BMS_FaultStatus;
    socGreaterL3: BMS_FaultStatus;
    chgCurGreaterL2: BMS_FaultStatus;
    chgCurGreaterL3: BMS_FaultStatus;
    canComFault: BMS_FaultStatus;
    mainRelayCutoffFault: BMS_FaultStatus;
    mainLoopBreakFault: BMS_FaultStatus;
    fstchgPortTempGreaterL3: BMS_FaultStatus;
    prechgFailFault: BMS_FaultStatus;
    heatingRelayCutoffFault: BMS_FaultStatus;
    prechgRelayFault: BMS_FaultStatus;
    mainNegRelayCutoffFault: BMS_FaultStatus;
    fstchgRelayCutoffFault: BMS_FaultStatus;
    dcChargerFault: number;
    dcanComFault: number;
    dcReceptacleHighTemp: number;
    dcReceptacleOverTemp: number;
    timestamp: number;
}

export interface DCAC_COMMAND {
    enableDCAC: VCU_EnableDCAC;
    enablePWM: VCU_EnablePWM;
    timestamp: number;
}

export interface DCAC_Status {
    sysStatus: DCAC_TaskState;
    handSwitch: number;
    tempModule: number;
    tempCapOBG: number;
    tempCapOBS: number;
    relay1: DCAC_RELAY1;
    relay2: DCAC_RELAY2;
    opt1: DCAC_OPT1;
    opt2: DCAC_OPT2;
    timestamp: number;
}

export interface ISG_COMMAND {
    isgChargeEnable: ISG_ChargeEnable;
    chgPosConState: ISG_ChgPos_ConState;
    liftTime: number;
    timestamp: number;
}

export interface RCU_Status01 {
    isgTor: number;
    isgSpeed: number;
    isgCurOutput: number;
    faultInfo: number;
    systemStatus: ISG_System_Status;
    liftTime: number;
    timestamp: number;
}

// 原始CAN报文数据类型
export interface PMS_RawCanFrames {
    BMS_Status01?: BMS_Status01;
    BMS_Status02?: BMS_Status02;
    BMS_FaultInfo?: BMS_FaultInfo;
    BMS_NorminalInfo?: any;
    BMS_TempInfo?: any;
    BMS_CellInfo?: any;
    BMS_Version?: any;
    BMS_CurInfo?: any;
    VCU_Status01?: any;
    VCU_Status02?: any;
    VCU_Status03?: any;
    VCU_Status04?: any;
    VCU_Status05?: any;
    VCU_Status06?: any;
    DCDC_Status?: any;
    DCAC_COMMAND?: DCAC_COMMAND;
    DCAC_Status?: DCAC_Status;
    DCAC_VAR?: any;
    DCAC_Ver?: any;
    OBC_Status01?: any;
    OBC_Status02?: any;
    OBC_Status03?: any;
    ISG_COMMAND?: ISG_COMMAND;
    RCU_Status01?: RCU_Status01;
}

// 汇总状态信息类型
export interface BMS {
    soc: number;
    voltage: number;
    current: number;
    temperature: number;
    faultLevel: BMS_FaultLevel;
}

export interface VCU {
    keyOn: boolean;
    pumpEnable: boolean;
    fanEnable: boolean;
    faultCode: number;
}

export interface DCAC {
    enableDCAC: VCU_EnableDCAC;
    systemStatus: number;
    tempModule: number;
    relay1: DCAC_RELAY1;
    relay2: DCAC_RELAY2;
}

export interface DCDC {
    runStatus: number;
    systemStatus: number;
    tempModule: number;
    volOutput: number;
    curOutput: number;
}

export interface OBC {
    systemStatus: number;
    volOutput: number;
    curOutput: number;
    tempModule: number;
    faultStatus: number;
}

export interface ISG {
    chargeEnable: ISG_ChargeEnable;
    systemStatus: ISG_System_Status;
    torque: number;
    speed: number;
    current: number;
    faultInfo: number;
}

export interface PMS_Status {
    bms: BMS;
    vcu: VCU;
    dcac: DCAC;
    dcdc: DCDC;
    obc: OBC;
    isg: ISG;
    timestamp: number;
}

// PMS 数据缓存管理类
class PmsDataCache {
    private rawCanFrames: PMS_RawCanFrames | null = null;
    private pmsStatus: PMS_Status | null = null;
    private lastUpdate = 0;
    private isUpdating = false;
    private updateInterval: NodeJS.Timeout | null = null;
    private subscribers = new Set<() => void>();
    private notifyTimeout: NodeJS.Timeout | null = null;
    private readonly UPDATE_INTERVAL = 1000; // 每秒刷新
    private readonly CACHE_TTL = 3000; // 3秒缓存有效期
    private isInitialized = false;

    constructor() {
        this.start();
    }

    private async start(): Promise<void> {
        try {
            console.log('Starting PMS data monitoring...');
            await this.refresh();
            this.isInitialized = true;
            this.startPeriodicUpdate();
        } catch (error) {
            console.error('Failed to start PMS data monitoring:', error);
        }
    }

    getData(): { raw: PMS_RawCanFrames | null; status: PMS_Status | null; isStale: boolean } {
        const isStale = Date.now() - this.lastUpdate > this.CACHE_TTL;
        return { 
            raw: this.rawCanFrames, 
            status: this.pmsStatus, 
            isStale 
        };
    }

    subscribe(callback: () => void): () => void {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    private notifySubscribers() {
        if (this.notifyTimeout) clearTimeout(this.notifyTimeout);
        this.notifyTimeout = setTimeout(() => {
            this.subscribers.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('Error in PMS data subscriber callback:', error);
                }
            });
            this.notifyTimeout = null;
        }, 50);
    }

    async refresh(): Promise<void> {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            const [rawRes, statusRes] = await Promise.all([
                api.get<PMS_RawCanFrames>('/battery/raw-can-frames'),
                api.get<PMS_Status>('/battery/pms-status')
            ]);

            const rawChanged = JSON.stringify(this.rawCanFrames) !== JSON.stringify(rawRes.data);
            const statusChanged = JSON.stringify(this.pmsStatus) !== JSON.stringify(statusRes.data);
            
            this.rawCanFrames = rawRes.data;
            this.pmsStatus = statusRes.data;
            this.lastUpdate = Date.now();

            if (rawChanged || statusChanged) {
                console.log('PMS data updated:', {
                    bms: {
                        soc: this.pmsStatus?.bms?.soc,
                        voltage: this.pmsStatus?.bms?.voltage,
                        current: this.pmsStatus?.bms?.current,
                        faultLevel: this.pmsStatus?.bms?.faultLevel
                    },
                    dcac: {
                        enableDCAC: this.pmsStatus?.dcac?.enableDCAC,
                        systemStatus: this.pmsStatus?.dcac?.systemStatus
                    },
                    timestamp: this.pmsStatus?.timestamp
                });
                this.notifySubscribers();
            }
        } catch (error) {
            console.error('Failed to refresh PMS data:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    private startPeriodicUpdate() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => this.refresh(), this.UPDATE_INTERVAL);
        console.log('PMS data periodic update started (1s interval)');
    }

    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    async forceRefresh(): Promise<void> {
        console.log('Force refreshing PMS data');
        await this.refresh();
    }
}

// 创建全局 PMS 数据缓存实例
export const pmsDataCache = new PmsDataCache();

// PMS 数据 API 函数
export const getPmsData = (): { raw: PMS_RawCanFrames | null; status: PMS_Status | null; isStale: boolean } => {
    return pmsDataCache.getData();
};

export const subscribeToPmsDataChanges = (callback: () => void): (() => void) => {
    return pmsDataCache.subscribe(callback);
};

export const isPmsDataReady = (): boolean => {
    return pmsDataCache.isReady();
};

export const refreshPmsData = async (): Promise<void> => {
    await pmsDataCache.forceRefresh();
};

// 获取原始 CAN 报文数据
export const getPmsRawCanFrames = (): PMS_RawCanFrames | null => {
    return pmsDataCache.getData().raw;
};

// 获取 PMS 状态信息
export const getPmsStatus = (): PMS_Status | null => {
    return pmsDataCache.getData().status;
};

// 在页面卸载时清理资源
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        pmsDataCache.stopPeriodicUpdate();
    });
}

