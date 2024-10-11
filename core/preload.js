import os from 'node:os'
import si from 'systeminformation'
import { contextBridge, ipcRenderer } from 'electron';
import { exec } from 'child_process'
import util from 'util'

import { exposeDockerApi } from '../src/utils/DockerApi';

const execAsync = util.promisify(exec);

window.remote = require('electron').remote;
window.ipcRenderer = require('electron').ipcRenderer;

window.addEventListener('DOMContentLoaded', () => {
	for (const versionType of ['chrome', 'electron', 'node']) {
		console.log(`${versionType}-version:${process.versions[versionType]}`);
	}
});

contextBridge.exposeInMainWorld('electron', {
	resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
	changeTitle: (title) => ipcRenderer.send('change-title', title),
});


contextBridge.exposeInMainWorld('electronAPI', {
	hideWindow: () => ipcRenderer.send('window-hide'),
	closeWindow: () => ipcRenderer.send('window-close'),
	maximizeindow: () => ipcRenderer.send('window-max'),
	minimizeWindow: () => ipcRenderer.send('window-min'),
	downloadUpdate: (downloadUrl) => ipcRenderer.send('download-update', downloadUrl),
	appQuit: () => ipcRenderer.send('app-quit'),
	cpus: () => {
		return os.cpus();
	},
	gpus: async () => {
		return (await si.graphics()).controllers
	},
	checkDockerInstalled: async () => {
		try {
			const { stdout } = await execAsync('docker --version');
			console.log('Docker is installed:', stdout);
			return stdout;
		} catch (error) {
			console.error('Error checking Docker installation:', error.stderr);
			return false;
		}
	},
	getPlatform: () => ipcRenderer.invoke('get-platform'),
	getAppVersion: () => ipcRenderer.invoke('get-app-version'),
	getMachineId: () => ipcRenderer.invoke('get-machine-id'),
	getArch: () => ipcRenderer.invoke('get-arch'),
	onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
})



contextBridge.exposeInMainWorld('dockerAPI', exposeDockerApi());