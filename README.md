# EasyMarkdown

<p align="center">
  <img src="markdown_icon_blue.svg" alt="EasyMarkdown Logo" width="120">
</p>

一款简洁优雅的 Markdown 编辑器，支持实时预览、多标签、多语言，同时提供网页版和桌面版。

🌐 **在线网页版**：https://cloudzhang0.github.io/EasyMarkdown/

=======
## 功能特性

### 编辑与预览
- 实时 Markdown 预览（支持 GFM 语法）
- 左右分栏编辑，可拖拽调整比例
- 代码高亮（highlight.js）
- Mermaid 图表渲染
- KaTeX 数学公式
- 全屏预览模式（Ctrl+Shift+F / ESC 退出）

### 视图控制
- 整页缩放（Ctrl+滚轮 / Ctrl+=/-/0，范围 50%-200%）
- 显示/隐藏行号
- 明暗主题切换
- 预览面板显示/隐藏（Ctrl+Shift+P）

### 格式化工具栏
- 标题（H1-H6）、粗体、斜体、删除线
- 有序/无序/任务列表
- 行内代码、代码块、引用块
- 链接、图片、表格、水平线
- 上标、下标、格式刷

### 文件管理
- 新建、打开、保存、另存为
- 导出 HTML、导出 PDF、打印
- 多标签管理
- 拖拽文件打开

### 桌面版专属
- 原生文件系统操作
- 文件夹侧边栏浏览
- 图片本地管理（粘贴/选择自动保存到 images/）
- 右键上下文菜单
- 语音输入
- 最近文件记录

### 国际化
支持 12 种语言：简体中文、繁體中文、English、日本語、한국어、Français、Deutsch、Español、Português、Русский、العربية、हिन्दी

## 下载安装

### Windows 安装版
下载 `EasyMarkdown Setup 1.1.0.exe`，双击运行安装程序，支持自定义安装路径。

### Windows 绿色版（便携版）
下载 `EasyMarkdown-1.1.0-Portable.exe`，双击直接运行，无需安装，不写注册表。

### 网页版
直接在浏览器中打开 `web/index.html` 即可使用，或部署到任意静态服务器。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+N | 新建文件 |
| Ctrl+O | 打开文件 |
| Ctrl+S | 保存 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+F | 查找 |
| Ctrl+H | 查找替换 |
| Ctrl+B | 粗体 |
| Ctrl+I | 斜体 |
| Ctrl+K | 插入链接 |
| Ctrl+Shift+G | 插入图片 |
| Ctrl+Shift+S | 删除线 |
| Ctrl+Shift+Q | 引用块 |
| Ctrl+Shift+U | 无序列表 |
| Ctrl+Shift+O | 有序列表 |
| Ctrl+Shift+P | 隐藏/显示预览 |
| Ctrl+Shift+F | 全屏预览（ESC 退出） |
| Ctrl+滚轮 | 缩放页面 |
| Ctrl+= | 放大 |
| Ctrl+- | 缩小 |
| Ctrl+0 | 重置缩放 |

## 技术栈

- **编辑器**: CodeMirror 5（GFM 模式）
- **Markdown 解析**: marked.js
- **代码高亮**: highlight.js
- **图表**: Mermaid
- **数学公式**: KaTeX
- **安全净化**: DOMPurify
- **桌面版**: Electron 28

## 项目结构

```
EasyMarkdown/
├── web/                    # 网页版源码
│   ├── index.html         # 主页面
│   ├── css/               # 样式文件
│   │   ├── themes.css     # 主题变量
│   │   ├── main.css       # 全局布局
│   │   ├── editor.css     # 编辑器样式
│   │   ├── preview.css    # 预览样式
│   │   ├── toolbar.css    # 工具栏样式
│   │   ├── menu.css       # 菜单样式
│   │   ├── statusbar.css  # 状态栏样式
│   │   ├── help.css       # 帮助弹窗样式
│   │   └── print.css      # 打印样式
│   ├── js/                # JavaScript 模块
│   │   ├── app.js         # 主应用入口
│   │   ├── editor.js      # 编辑器模块
│   │   ├── preview.js     # 预览渲染
│   │   ├── menu.js        # 菜单系统
│   │   ├── toolbar.js     # 工具栏
│   │   ├── shortcuts.js   # 快捷键
│   │   ├── file-manager.js# 文件管理
│   │   ├── tab-manager.js # 多标签管理
│   │   ├── splitter.js    # 分割面板
│   │   ├── i18n.js        # 国际化
│   │   ├── help.js        # 帮助弹窗
│   │   ├── utils.js       # 工具函数
│   │   └── desktop-bridge.js # 桌面版桥接
│   └── lib/               # 第三方库（CodeMirror、marked 等）
├── desktop/                # 桌面版（Electron）
│   ├── main.js            # 主进程
│   ├── preload.js         # 预加载脚本
│   └── package.json       # 依赖配置
├── docs/                   # GitHub Pages 部署（web 副本）
└── README.md
```

## 开发

### 网页版开发
```bash
# 启动本地服务器
cd web
python -m http.server 8081
# 浏览器访问 http://localhost:8081
```

### 桌面版开发
```bash
cd desktop
npm install
npm start
```

### 打包构建
```bash
cd desktop
npm run build:win    # Windows（安装版 + 绿色版）
npm run build:mac    # macOS
npm run build:linux  # Linux
```

构建产物输出到 `desktop/dist/` 目录。

## 更新日志

### v1.1.0 (2026-05-09)

**新功能**
- 全屏预览模式：Ctrl+Shift+F 进入，ESC 或 Ctrl+Shift+F 退出，只显示预览面板
- 整页缩放：Ctrl+滚轮上下滚动缩放（50%-200%），替代原有的仅编辑器字体缩放
- 视图菜单新增"全屏预览"选项
- 软件图标：添加 Markdown 蓝色图标（SVG），网页版显示 favicon，桌面版替换默认 Electron 图标

**改进**
- Ctrl+=/-/0 快捷键改为整页缩放（之前只缩放编辑器字体）
- 菜单项"放大字体/缩小字体/重置字体大小"改为"放大/缩小/重置缩放"
- 打包支持同时生成安装版（NSIS）和绿色版（Portable）

**文档**
- 新增 README.md 项目文档

### v1.0.0

- 初始版本发布
- 实时 Markdown 预览（GFM、代码高亮、Mermaid、KaTeX）
- 多标签编辑
- 12 种语言国际化
- 桌面版（Electron）：文件夹侧边栏、图片管理、右键菜单、语音输入

如果这个项目对你有帮助，欢迎点个 ⭐ Star 支持一下～

## 许可证

MIT License
