const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

let mainWindow;
let nextServerProcess;
let tray;
const PORT = 3000;

function waitForServer(port, callback) {
  const tryConnection = () => {
    const socket = new net.Socket();
    socket.once('connect', () => {
      socket.destroy();
      callback();
    });
    socket.once('error', (err) => {
      setTimeout(tryConnection, 200);
    });
    socket.connect(port, '127.0.0.1');
  };
  tryConnection();
}

function startNextJsServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, '.next', 'standalone', 'server.js')
    : path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');

  const env = { 
    ...process.env, 
    PORT: PORT.toString(), 
    HOSTNAME: '0.0.0.0',
    ELECTRON_RUN_AS_NODE: '1'
  };
  
  nextServerProcess = spawn(process.execPath, [serverPath], {
    env,
    stdio: 'pipe'
  });

  nextServerProcess.stdout.on('data', (data) => console.log(`Next.js: ${data}`));
  nextServerProcess.stderr.on('data', (data) => console.error(`Next.js Error: ${data}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'logo.png') // Make sure this exists
  });

  Menu.setApplicationMenu(null);

  waitForServer(PORT, () => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startNextJsServer();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});
