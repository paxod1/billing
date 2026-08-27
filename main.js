const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
let frontendProcess;

const BACKEND_PORT = process.env.PORT || 5000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

function isBackendRunningPort(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => {
            resolve(false);
        });
        req.end();
    });
}

function startBackendServer() {
    return new Promise((resolve) => {
        const serverPath = path.join(__dirname, 'backend', 'src', 'server.js');
        console.log(`📁 Starting Billing Backend Server from: ${serverPath}`);

        backendProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                PORT: BACKEND_PORT,
                NODE_ENV: process.env.NODE_ENV || 'production'
            },
            stdio: 'pipe'
        });

        if (backendProcess.stdout) {
            backendProcess.stdout.on('data', (data) => console.log(`[Backend] ${data.toString().trim()}`));
        }
        if (backendProcess.stderr) {
            backendProcess.stderr.on('data', (data) => console.error(`[Backend ERR] ${data.toString().trim()}`));
        }

        setTimeout(resolve, 2500);
    });
}

async function createWindow() {
    const isRunning = await isBackendRunningPort(BACKEND_PORT);
    if (!isRunning) {
        await startBackendServer();
    }

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 850,
        minWidth: 1024,
        minHeight: 700,
        title: "Billing Software",
        icon: path.join(__dirname, 'frontend', 'public', 'favicon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true
    });

    mainWindow.maximize();

    const startUrl = process.env.ELECTRON_START_URL || `http://localhost:${FRONTEND_PORT}`;

    const loadAppWithRetry = (url, attemptsLeft = 12) => {
        mainWindow.loadURL(url).catch((err) => {
            if (attemptsLeft > 0) {
                console.log(`Waiting for app server at ${url}... (${attemptsLeft} retries left)`);
                setTimeout(() => loadAppWithRetry(url, attemptsLeft - 1), 1500);
            } else {
                console.error("Could not connect to app frontend URL:", err);
            }
        });
    };

    loadAppWithRetry(startUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    cleanUpProcesses();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    cleanUpProcesses();
});

function cleanUpProcesses() {
    if (backendProcess) {
        try { backendProcess.kill(); } catch (e) {}
        backendProcess = null;
    }
    if (frontendProcess) {
        try { frontendProcess.kill(); } catch (e) {}
        frontendProcess = null;
    }
}
