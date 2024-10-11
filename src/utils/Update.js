// import path from 'path';
// import fetch from 'node-fetch';
// import fs from 'fs';
// import AdmZip from 'adm-zip';
// import fsExtra from 'fs-extra';
// import { app } from 'electron';

// async function downloadUpdate(url, dest) {
//   const response = await fetch(url);
//   const fileStream = fs.createWriteStream(dest);
//   await new Promise((resolve, reject) => {
//     response.body.pipe(fileStream);
//     response.body.on('error', reject);
//     fileStream.on('finish', resolve);
//   });
// }

// export async function updateApp(url) {
//   const downloadPath = path.join(__dirname, 'update.zip');
//   const extractPath = path.join(__dirname, 'update');

//   // Download the update file
//   try {
//     await downloadUpdate(url, downloadPath);
//     console.log('Download complete');
//   } catch (error) {
//     console.error('Download failed:', error);
//     return;
//   }

//   // Unzip the update file
//   try {
//     const zip = new AdmZip(downloadPath);
//     zip.extractAllTo(extractPath, true);
//     console.log('Extract complete');
//   } catch (error) {
//     console.error('Extraction failed:', error);
//     return;
//   }

//   // Replace old files
//   try {
//     fsExtra.copySync(extractPath, __dirname, { overwrite: true });
//     console.log('Files replaced');
//   } catch (error) {
//     console.error('File replacement failed:', error);
//     return;
//   }

//   // Restart the application
//   app.relaunch();
//   app.exit(0);
// }
