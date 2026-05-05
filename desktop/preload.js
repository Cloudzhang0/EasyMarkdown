/**
 * EasyMarkdown Desktop - Preload Script
 * Securely exposes IPC methods to the renderer process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file-content', { content, filePath }),
  saveFileAs: (content) => ipcRenderer.invoke('save-file-as', { content }),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openRecentFile: (filePath) => ipcRenderer.invoke('open-recent-file', filePath),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  openFileByPath: (filePath) => ipcRenderer.invoke('open-file-by-path', filePath),

  // Image operations (Desktop enhancement)
  readImageFile: (filePath) => ipcRenderer.invoke('read-image-file', filePath),
  resolveImage: (src, currentDir) => ipcRenderer.invoke('resolve-image', { src, currentDir }),
  copyImageToImages: (sourcePath, targetDir) => ipcRenderer.invoke('copy-image-to-images', { sourcePath, targetDir }),
  saveClipboardImage: (imageBuffer, targetDir, ext) => ipcRenderer.invoke('save-clipboard-image', { imageBuffer, targetDir, ext }),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),

  // File system operations for context menu
  createFile: (dirPath, fileName) => ipcRenderer.invoke('create-file', { dirPath, fileName }),
  createFolder: (dirPath, folderName) => ipcRenderer.invoke('create-folder', { dirPath, folderName }),
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', { oldPath, newName }),
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', { itemPath }),
  copyPath: (itemPath) => ipcRenderer.invoke('copy-path', { itemPath }),
  openInExplorer: (itemPath) => ipcRenderer.invoke('open-in-explorer', { itemPath }),
  refreshFolderTree: (dirPath) => ipcRenderer.invoke('refresh-folder-tree', { dirPath }),

  // Event listeners from main process
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  onFolderOpened: (callback) => ipcRenderer.on('folder-opened', (event, data) => callback(data)),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),
  onRequestSave: (callback) => ipcRenderer.on('request-save', () => callback()),
  onRequestSaveAs: (callback) => ipcRenderer.on('request-save-as', () => callback()),

  // Platform info
  platform: process.platform,
  isElectron: true,

  // App lifecycle
  exitApp: () => ipcRenderer.invoke('exit-app'),
});