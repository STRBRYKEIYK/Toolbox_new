// main.js - Electron main process
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Import electron-serve correctly
let loadURL;
try {
  const serve = require('electron-serve');
  loadURL = serve({ directory: 'out' });
} catch (err) {
  console.log('electron-serve not available in dev mode');
}

// Keep a global reference of the mainWindow object
let mainWindow;

function isDev() {
  return !app.isPackaged;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set the app icon
  if (process.platform === 'win32') {
    mainWindow.setIcon(path.join(__dirname, 'public', 'placeholder-logo.png'));
  }

  if (isDev()) {
    // Load from development server
    await mainWindow.loadURL('http://localhost:3000');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html when not in development
    if (loadURL) {
      await loadURL(mainWindow);
    } else {
      await mainWindow.loadFile(path.join(__dirname, 'out/index.html'));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});