/**
 * EasyMarkdown Desktop - Electron Main Process
 * Handles file system operations, window management, and native menus.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference to prevent garbage collection
let mainWindow = null;
let currentFilePath = null;

// Window state persistence
const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  } catch {
    return { width: 1200, height: 800 };
  }
}

// Extract .md file path from command line arguments (Windows file association)
function getFileFromArgv(argv) {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--') && /\.(md|markdown|txt)$/i.test(arg)) {
      return arg;
    }
  }
  return null;
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const isMaximized = mainWindow.isMaximized();
  try {
    fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, isMaximized }));
  } catch (e) {
    // ignore
  }
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1200,
    height: state.height || 800,
    x: state.x,
    y: state.y,
    minWidth: 768,
    minHeight: 500,
    title: 'EasyMarkdown',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      webSecurity: false,  // Allow loading local images
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Remove native menu bar (we use custom HTML menu)
  mainWindow.setMenuBarVisibility(false);

  // Load the web version
  // Packaged: web files are in resources/web/ (via extraResources)
  // Dev: web files are at ../web/ relative to desktop/
  const webPath = app.isPackaged
    ? path.join(process.resourcesPath, 'web', 'index.html')
    : path.join(__dirname, '..', 'web', 'index.html');
  mainWindow.loadFile(webPath);

  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Native menu disabled - using custom HTML menu instead
  // buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendAction('new'),
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFileDialog(),
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => openFolderDialog(),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => saveFile(),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => saveFileDialog(),
        },
        { type: 'separator' },
        {
          label: 'Export HTML...',
          click: () => sendAction('exportHTML'),
        },
        {
          label: 'Export PDF...',
          click: () => sendAction('exportPDF'),
        },
        { type: 'separator' },
        {
          label: 'Print',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendAction('print'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendAction('find'),
        },
        {
          label: 'Find & Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => sendAction('replace'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendAction('togglePreview'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Line Numbers',
          click: () => sendAction('toggleLineNumbers'),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => sendAction('zoomIn'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => sendAction('zoomOut'),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendAction('resetZoom'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          click: () => sendAction('toggleTheme'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Getting Started',
          click: () => sendAction('gettingStarted'),
        },
        {
          label: 'Markdown Cheatsheet',
          click: () => sendAction('cheatsheet'),
        },
        {
          label: 'Useful Tools',
          click: () => sendAction('tools'),
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          click: () => sendAction('shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => sendAction('about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function sendAction(action) {
  if (mainWindow) {
    mainWindow.webContents.send('menu-action', action);
  }
}

// File dialog - Open single file
async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Markdown File',
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    loadFile(filePath);
  }
}

// Folder dialog - Open folder for tree view
async function openFolderDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Folder',
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const tree = buildFileTree(folderPath);
    if (mainWindow) {
      mainWindow.webContents.send('folder-opened', { path: folderPath, tree });
    }
  }
}

// Build file tree for folder view
function buildFileTree(dirPath) {
  const items = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: buildFileTree(fullPath),
        });
      } else if (/\.(md|markdown)$/i.test(entry.name)) {
        items.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
        });
      }
    }
    // Sort: directories first, then files alphabetically
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (e) {
    // ignore permission errors
  }
  return items;
}

// Load a file and send content to renderer
function loadFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    currentFilePath = filePath;
    if (mainWindow) {
      mainWindow.webContents.send('file-opened', { path: filePath, name: path.basename(filePath), content });
      mainWindow.setTitle(path.basename(filePath) + ' - EasyMarkdown');
    }
    addToRecent(filePath);
  } catch (err) {
    dialog.showErrorBox('Error', 'Failed to open file: ' + err.message);
  }
}

// Save file (overwrite current)
function saveFile() {
  if (mainWindow) {
    mainWindow.webContents.send('request-save');
  }
}

// Save As dialog
async function saveFileDialog() {
  if (mainWindow) {
    mainWindow.webContents.send('request-save-as');
  }
}

// Recent files management
const RECENT_FILE = path.join(app.getPath('userData'), 'recent-files.json');

function getRecentFiles() {
  try {
    return JSON.parse(fs.readFileSync(RECENT_FILE, 'utf-8')) || [];
  } catch {
    return [];
  }
}

function addToRecent(filePath) {
  let recent = getRecentFiles();
  recent = recent.filter(f => f.path !== filePath);
  recent.unshift({ path: filePath, name: path.basename(filePath), timestamp: Date.now() });
  if (recent.length > 10) recent = recent.slice(0, 10);
  try {
    fs.writeFileSync(RECENT_FILE, JSON.stringify(recent, null, 2));
  } catch (e) {
    // ignore
  }
}

// IPC Handlers
ipcMain.handle('save-file-content', async (event, { content, filePath }) => {
  try {
    // Use ONLY renderer's filePath (the authoritative source).
    // Do NOT fall back to main.js currentFilePath which may be stale
    // and cause overwriting the wrong file.
    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Markdown File',
        defaultPath: 'untitled.md',
        filters: [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled) return { success: false };
      fs.writeFileSync(result.filePath, content, 'utf-8');
      currentFilePath = result.filePath;
      mainWindow.setTitle(path.basename(result.filePath) + ' - EasyMarkdown');
      addToRecent(result.filePath);
      return { success: true, path: result.filePath, name: path.basename(result.filePath) };
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath, name: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-file-as', async (event, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save As',
    defaultPath: currentFilePath || 'untitled.md',
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return { success: false };
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    currentFilePath = result.filePath;
    mainWindow.setTitle(path.basename(result.filePath) + ' - EasyMarkdown');
    addToRecent(result.filePath);
    return { success: true, path: result.filePath, name: path.basename(result.filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-file-dialog', async () => {
  await openFileDialog();
});

ipcMain.handle('open-folder-dialog', async () => {
  await openFolderDialog();
});

ipcMain.handle('open-recent-file', async (event, filePath) => {
  loadFile(filePath);
});

ipcMain.handle('get-recent-files', async () => {
  return getRecentFiles();
});

ipcMain.handle('open-file-by-path', async (event, filePath) => {
  loadFile(filePath);
});

ipcMain.handle('read-image-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/png';
    return { success: true, data: `data:${mime};base64,${data.toString('base64')}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-image-to-images', async (event, { sourcePath, targetDir }) => {
  try {
    const imagesDir = path.join(targetDir, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const fileName = path.basename(sourcePath);
    const targetPath = path.join(imagesDir, fileName);
    fs.copyFileSync(sourcePath, targetPath);
    return { success: true, relativePath: `images/${fileName}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('resolve-image', async (event, { src, currentDir }) => {
  // Skip URLs and data URIs
  if (/^(data:|https?:|file:)/.test(src)) return src;
  if (!currentDir) return src;

  let absPath;
  if (path.isAbsolute(src)) {
    absPath = src;
  } else {
    absPath = path.resolve(currentDir, src);
  }

  try {
    const data = fs.readFileSync(absPath);
    const ext = path.extname(absPath).slice(1).toLowerCase();
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon' };
    const mime = mimeMap[ext] || 'image/png';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (e) {
    return src; // Failed to read - return original path
  }
});

// Save clipboard image to images/ directory
ipcMain.handle('save-clipboard-image', async (event, { imageBuffer, targetDir, ext }) => {
  try {
    const imagesDir = path.join(targetDir, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const fileName = `paste-${timestamp}-${random}.${ext}`;
    const filePath = path.join(imagesDir, fileName);
    const buffer = Buffer.from(imageBuffer);
    fs.writeFileSync(filePath, buffer);
    return { success: true, relativePath: `images/${fileName}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open native file dialog to select an image file
ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return { path: filePath, name: path.basename(filePath) };
});

ipcMain.handle('exit-app', async () => {
  app.quit();
});

// File system operations for context menu
ipcMain.handle('create-file', async (event, { dirPath, fileName }) => {
  try {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      return { success: false, error: 'File already exists' };
    }
    fs.writeFileSync(filePath, '', 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-folder', async (event, { dirPath, folderName }) => {
  try {
    const folderPath = path.join(dirPath, folderName);
    if (fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder already exists' };
    }
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, path: folderPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-item', async (event, { oldPath, newName }) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    if (fs.existsSync(newPath)) {
      return { success: false, error: 'Name already exists' };
    }
    fs.renameSync(oldPath, newPath);
    return { success: true, path: newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-item', async (event, { itemPath }) => {
  try {
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      fs.rmSync(itemPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(itemPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-path', async (event, { itemPath }) => {
  const { clipboard } = require('electron');
  clipboard.writeText(itemPath);
  return { success: true };
});

ipcMain.handle('open-in-explorer', async (event, { itemPath }) => {
  shell.showItemInFolder(itemPath);
  return { success: true };
});

ipcMain.handle('refresh-folder-tree', async (event, { dirPath }) => {
  try {
    const tree = buildFileTree(dirPath);
    return { success: true, tree: tree };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Single instance lock - prevent multiple app instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Another instance tried to launch - bring this window to front and open the file
    const filePath = getFileFromArgv(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (filePath) {
        loadFile(filePath);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Open file passed via command line (e.g. double-click associated .md file)
    const startupFile = getFileFromArgv(process.argv);
    if (startupFile) {
      // Wait for renderer to initialize before loading file
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => loadFile(startupFile), 500);
      });
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle file open on macOS (drag file onto dock icon)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    loadFile(filePath);
  }
});