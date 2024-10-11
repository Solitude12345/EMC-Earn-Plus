const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require('electron');
const { exec } = require('child_process')
const fs = require('fs');
const path = require('node:path');
import os from 'node:os'
import { machineIdSync } from 'node-machine-id';

app.commandLine.appendSwitch('disable-gpu');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

let mainWindow

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 450,
		height: 800,
		// show: false,
		resizable: false,
		transparent: true,
		maximizable: false,
		frame: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegrationInWorker: true
		},
		icon: path.join(__dirname, 'src/assets/icons/app-icon.png')
	});

	// mainWindow.once('ready-to-show', () => {
	// 	mainWindow.show()
	// })

	// and load the index.html of the app.
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/`);
		// Open the DevTools.
		mainWindow.webContents.openDevTools({ mode: 'undocked' })
	} else {
		mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow();
	const ret = globalShortcut.register('Alt+CommandOrControl+Shift+D', () => {
		mainWindow.webContents.openDevTools();
	});

	if (!ret) {
		console.log('Register shortcut keys failed');
	}

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


ipcMain.on('resize-window', (event, width, height) => {
	if (mainWindow) {
		mainWindow.setSize(width, height);
		mainWindow.center();
		// animateWindowResize(mainWindow, width, height)
	}
});

ipcMain.on('change-title', (event, title) => {
	if (mainWindow) {
		mainWindow.setTitle(title);
	}
});

ipcMain.on('window-close', (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	win.close();
})

ipcMain.on('window-min', function (event) {
	const win = BrowserWindow.fromWebContents(event.sender);
	win.minimize();
})

ipcMain.on('window-max', function (event) {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win.isMaximized()) {
		win.restore();
	} else {
		win.maximize();
	}
})
ipcMain.on('window-hide', function (event) {
	const win = BrowserWindow.fromWebContents(event.sender);
	win.hide();
})

ipcMain.on('app-quit', function (event) {
	app.quit();
})

// app 
ipcMain.handle('get-user-data-path', () => {
	return app.getPath('userData');
});

ipcMain.handle('get-platform', () => {
	const currentPlatform = process.platform;
	// console.error('---------------platform', process.platform);
	return currentPlatform;
});

ipcMain.handle('get-app-version', (event) => {
	const version = app.getVersion();
	return version;
});

ipcMain.on('download-update', (event, downloadUrl) => {
	// shell.openExternal(downloadUrl);
	// app.quit();
	// return
	const platform = process.platform;
	if (platform == 'linux') {
		shell.openExternal(downloadUrl);
		app.quit();
	} else {
		const win = BrowserWindow.getAllWindows()[0];

		win.webContents.session.once('will-download', (event, item, webContents) => {
			const filePath = path.join(app.getPath('downloads'), item.getFilename());
			const tempDir = path.join(app.getPath('downloads'), 'EMC-Earn-App-Temp');  // Temporary directory

			item.setSavePath(filePath);

			item.on('updated', (event, state) => {
				if (state === 'progressing') {
					const received = item.getReceivedBytes();
					const total = item.getTotalBytes();
					const progress = (received / total) * 100;
					webContents.send('download-progress', progress);
				}
			});

			item.once('done', (event, state) => {
				if (state === 'completed') {
					// if (platform == 'darwin') {
					// 	// Unzip to temporary directory
					// 	unzipWithSystemTool(filePath, tempDir, () => {
					// 		const extractedFiles = fs.readdirSync(tempDir);
					// 		const appFile = extractedFiles.find(file => file.endsWith('.app'));

					// 		if (appFile) {
					// 			const installerPath = path.join(tempDir, appFile);

					// 			// Remove quarantine flag
					// 			removeQuarantineFlag(installerPath, () => {
					// 				// Close the current application
					// 				app.quit();

					// 				// Delay for a short period to allow the app to fully exit
					// 				setTimeout(() => {
					// 					// Move the extracted files to the target directory
					// 					moveFilesToAppDir(installerPath, path.join(app.getPath('downloads'), 'EMC-Earn-App'), () => {
					// 						// Restart the application
					// 						shell.openPath(path.join(app.getPath('downloads'), 'EMC-Earn-App', appFile)).catch(err => {
					// 							console.error('Failed to open app', err);
					// 						});
					// 					});
					// 				}, 1000);
					// 			});
					// 		} else {
					// 			console.error('Application file not found');
					// 		}
					// 	});
					// } else {
					shell.openPath(filePath).then(() => {
						app.quit();
					}).catch((err) => {
						console.error('Failed to open app', err);
					});
					// }
				} else {
					console.error('Download failed:', state);
				}
			});
		});

		win.webContents.downloadURL(downloadUrl);
	}
});

ipcMain.handle('get-machine-id', async () => {
	const id = machineIdSync();
	return id;
});
ipcMain.handle('get-arch', async () => {
	const arch = os.arch();
	return arch;
});

// Unzip using the system's unzip tool
function unzipWithSystemTool(zipFilePath, outputDir, callback) {
	const command = `ditto -xk "${zipFilePath}" "${outputDir}"`;
	console.log(111111);

	exec(command, (error, stdout, stderr) => {
		console.log(2222);

		if (error) {
			console.error(`Error while decompressing: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Unzip command line error: ${stderr}`);
			return;
		}
		console.log('Decompression completed:', stdout);
		callback();
	});
}

function removeQuarantineFlag(appPath, callback) {
	// com.apple.quarantine
	const command = `xattr -rc "${appPath}"`;

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error removing quarantine flag: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Command line error: ${stderr}`);
			return;
		}
		console.log(`Command line error: ${stdout}`);
		// Execute callback after removal is completed
		callback();
	});
}

// Move files to the target directory
function moveFilesToAppDir(tempAppPath, appDir, callback) {
	const command = `ditto "${tempAppPath}" "${appDir}"`;

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error moving files: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Command line error while moving files: ${stderr}`);
			return;
		}
		console.log('Files moved successfully:', stdout);
		callback();
	});
}