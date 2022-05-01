const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const {autoUpdater} = require('electron-updater');

const {WebServer} = require('./lib/webserver');
const {AppConfig} = require('./lib/config');
const {Networking} = require('./lib/networking');
const {Install} = require('./lib/install');
const {Datacenter} = require('./lib/Datacenter');

const DC = new Datacenter('TW');
DC.decrypt('B5AE92062ACC7452EB6FBB44EC2D612D', '11E5B808F6922217F6FFB977321A0960');
DC.read();
DC.getFiles();
DC.writeFiles();

const config = new AppConfig();
config.getConfig();

const networking = new Networking();
let mainWindow;

const server = new WebServer();

/*
 * If lock is not set, we quit, else we either focus on existing instance
 * or we launch a fresh instance if no first instance
 */

/**
 * Create the window
 * Retrieve list of all mods from linked Github repo
 * create IPC channels to listen to for available self-updates / software env query
 */

async function loadMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        backgroundColor: '#212529',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
    });

    const ses = mainWindow.webContents.session;
    await ses.clearCache();

    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'), {
        query: {
            "token": config.data.token
        }
    });

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.maximize();
    });

    /*mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });*/
}

app.on("ready", loadMainWindow);

autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
});

ipcMain.on('ispackaged', () => {
    mainWindow.webContents.send('ispackaged', app.isPackaged);
});

app.disableHardwareAcceleration();

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('add-token', (event, token) => {
    config.setConfig('token', token);

    app.relaunch();
    app.exit(0);
});

ipcMain.on('version', (event) => {
    event.reply('version', app.getVersion());
});

ipcMain.on('get_vhosts_list', (event) => {
    let vhosts = server.list_vhosts();
    event.reply('get_vhosts_list', vhosts);
});

ipcMain.on('start_server',  (event) => {
     server.start(event);
});

ipcMain.on('stop_server',  (event) => {
    server.stop(event);
});

ipcMain.on('create_vhost', (event, args) => {
    server.create_vhost(event, args);
})

ipcMain.on('install', (event) => {
    const install = new Install(event);
    install.verifyInstall();
});

ipcMain.on('settings', (event) => {
    event.reply('settings', config.data);
});