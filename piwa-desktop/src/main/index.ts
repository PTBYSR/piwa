import { app, shell, BrowserWindow, Tray, Menu, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initWhatsAppManager } from './whatsapp-manager'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 380,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    backgroundColor: '#171717',
    ...(process.platform === 'linux' ? { icon } : { icon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  const splashUrl = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}#splash`
    : `file://${join(__dirname, '../renderer/index.html')}#splash`

  splashWindow.loadURL(splashUrl)

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 450,
    show: false, // Hidden until splash is done
    frame: false,
    resizable: true,
    autoHideMenuBar: true,
    skipTaskbar: false,
    backgroundColor: '#171717',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  // The beautiful hand-off: Wait for the main window to be fully rendered
  mainWindow.once('ready-to-show', () => {
    // Give the user 5 seconds to appreciate the cool splash screen illusion
    setTimeout(() => {
      splashWindow?.close()
      splashWindow = null
      mainWindow?.show()
      mainWindow?.focus()
    }, 5000)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Window control IPC ──
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window-close', () => mainWindow?.hide())

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.piwa.desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createSplashWindow()
  createWindow()

  // System Tray
  tray = new Tray(icon)
  tray.setToolTip('Piwa')

  if (mainWindow) {
    initWhatsAppManager(mainWindow)
  }

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })

  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Piwa',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Piwa',
        click: () => {
          app.quit()
        },
      },
    ])
    tray?.popUpContextMenu(contextMenu)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Keep running in background
app.on('window-all-closed', () => {
  // do nothing — keep running in tray
})
