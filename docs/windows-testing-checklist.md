# Windows 手动测试清单

> 本项目纯本地 Git 管理、不推远程(见 `local-verification.md`),因此 Windows 端无法用 CI 自动验证。
> 开发主力在 macOS,以下功能**只能在真实 Windows 机器或虚拟机上验证**。拿到 Windows 环境后照此逐项测。

## 0. 构建与安装

- [ ] 在任意机器上 `npm run build:win` 成功产出 `dist/penumbra-<version>-setup.exe`（已含 x64 + arm64）
- [ ] 在 **x64** Windows 上双击安装包能装上、能启动（主流用户，最重要）
- [ ] 在 **arm64** Windows（如 Surface Pro X）上能装能启动
- [ ] 安装为单击安装、装到用户目录（`oneClick=true perMachine=false`），桌面有快捷方式
- [ ] 未签名会触发 SmartScreen 警告——确认“仍要运行”后可正常启动（如需消除警告需配代码签名证书）

## 1. 窗口与隐身（Windows 特有路径）

- [ ] 窗口无系统标题栏（frameless），header 右侧的**自定义关闭按钮**能关掉应用
- [ ] header 各按钮 hover 有 tooltip（含关闭按钮，此前唯一缺失的已补）
- [ ] 拖 header 空白处能移动窗口；设置页/帮助页的 header 同样可拖
- [ ] `hideOrShowMainWindow` 快捷键（Windows 默认 `Ctrl+H`）能把窗口**移到屏幕外隐藏**、再按恢复（Windows 走 soft-hide，非最小化）
- [ ] 屏幕共享/录屏时窗口不可见（`setContentProtection`），且**应用内的更新提示/取色盘等 UI 也一并隐身**（这正是不用原生弹窗的原因）

## 2. 快捷键（Windows 别名逻辑）

- [ ] 所有全局快捷键在 Windows 上触发正常（截图 `Ctrl+Enter`、转写 `Ctrl+Shift+T` 等）
- [ ] 纯 Alt 快捷键额外注册了 `Ctrl+Alt` 变体（`getShortcutRegistrationKeys` 已单测，真机确认实际能触发）
- [ ] 快捷键徽章显示为 Windows 惯例（`Ctrl+Shift+T`，非 mac 符号）
- [ ] 隐身开关快捷键 `Alt+Shift+S`（`toggleContentProtection`）能开关屏幕共享隐身，设置里的开关同步、有 toast

## 3. UI 渲染

- [ ] 字体回退到 Segoe UI（英文）/ 微软雅黑（中文），不是难看的默认字体
- [ ] 强调色**取色盘**能打开（内置 HSV 盘，非系统弹窗）、选色实时生效、hex 输入可用
- [ ] 窗口圆角（`is-win` 8px）正常，透明背景无黑框
- [ ] 五语言 UI 切换正常

## 4. 自动更新（当前已禁用）

- [ ] 现状：`AUTO_UPDATE_ENABLED=false`，启动**不应**有任何更新检查/网络请求/弹窗
- [ ] 将来发版开启后（flag 改 true + 配真实 publish 源）：更新提示应是**应用内右下角的隐身条**（`UpdateBanner`），绝不是原生系统弹窗；含“下载→进度→重启”流程

## 5. 语音转写（跨平台，但 Windows 值得单独验）

- [ ] Windows 上 `getDisplayMedia` 系统音频 loopback **可用**（这是 Electron 在 Windows 支持、macOS 不支持的路径——面试官声音无需 BlackHole 即可采集）
- [ ] 双音源说话人区分正常（系统音→面试官、麦克风→我）
