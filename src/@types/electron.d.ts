import os from 'node:os'
import { Systeminformation } from 'systeminformation';
import { DockerApi } from '@/utils/DockerApi';

export interface ElectronAPI {
    hideWindow: () => void;
    closeWindow: () => void;
    maximizeWindow: () => void;
    minimizeWindow: () => void;
    cpus: () => os.CpuInfo[];
    gpus: () => Promise<Systeminformation.GraphicsControllerData[]>;
    checkDockerInstalled: () => Promise<string>;
    getPlatform: () => string;
    getAppVersion: () => string;
    getMachineId: () => void;
    getArch: () => string;
}

declare global {
    interface Window {
        dockerAPI: DockerApi;
        electronAPI: ElectronAPI;
    }
}