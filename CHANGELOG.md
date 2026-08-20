# Changelog

## Penumbra 1.9.3 - 2026-08-21

### Stable macOS capture permissions

- Added a stable local signing identity flow and release preflight checks so macOS Screen
  Recording permissions can survive local rebuilds.
- Wired GitHub Actions for a real macOS signing certificate through `MAC_CSC_LINK` and
  `MAC_CSC_KEY_PASSWORD`; public releases still require those repository secrets.
- Fixed local PKCS#12 certificate creation on current macOS/OpenSSL combinations.

### 0 UI and appearance

- Added one-percent 0 UI background opacity shortcuts with independent light and dark presets,
  including fully transparent backgrounds.
- Added configurable 0 UI text/background colors and border visibility, with smaller window and
  font limits for dual-screen workflows.
- 0 UI now renders live assistant output directly and shows a clear empty-state hint instead of
  appearing blank.

### Validation

- Added migration, appearance, shortcut, release-preflight, and 0 UI contract coverage.

## Penumbra 1.9.2 - 2026-08-14

### 0 UI mode

- Added the global `Alt+Shift+H` shortcut and a synchronized Settings toggle for entering or
  leaving 0 UI mode.
- 0 UI mode now bypasses the regular chat renderer and displays only compact assistant plaintext.
- Added separate light-background and dark-background presets for camera-aware tuning.
- Reduced the minimum window size to 200 × 120 pixels, UI text to 9 px, answer text to 8 px, and
  screenshot thumbnails to a maximum width of 112 px.
- Added IPC, settings migration, shortcut scope, appearance, and 0 UI regression coverage.

### Documentation and metadata

- Replaced the README with a detailed English project guide covering installation, configuration,
  privacy boundaries, shortcuts, packaging, troubleshooting, and responsible use.
- Added an English contribution guide and updated the package metadata, author attribution, and
  project version for the 1.9.2 release.

## Penumbra 1.9.1 - 2026-08-14

### 全屏悬浮与防共享

- 支持在 macOS 独立全屏空间中保持悬浮，使用 `⌥ + H` 可直接在当前全屏应用上方显示或隐藏 Penumbra。
- 呼出窗口时不切换桌面、不退出全屏，也不抢占当前全屏应用的输入焦点。
- 全屏悬浮继续保留屏幕共享隐身，窗口对本人可见，但不会进入系统屏幕捕获与共享画面。
- 隐藏 Dock 图标时使用配件应用模式，并在恢复 Dock 图标后正确切回普通应用模式。
- 增加全屏空间、窗口层级、无焦点呼出和 Dock 模式切换的自动化回归测试。

## Penumbra 1.9.0 - 2026-08-14

### 回答服务

- 新增多套回答服务配置，每套配置独立保存地址、协议、模型清单和加密 Key。
- 支持自动、Responses API、Chat Completions 和 Anthropic Messages，并允许直接填写完整接口路由。
- 内置常见模型清单；账号模型改为显式刷新和本地缓存，避免页面频繁请求。
- 修复 Responses API 可用性检查：不再重复拼接 `/responses`，并使用服务端可接受的最小输出长度。
- 改进流式回答的超时、重试和中止处理，降低截图解题偶发失败率。

### 实时面试

- 重做实时语音辅助界面，将问题、回答框架、证据、风险和追问提示分层展示。
- 新增问题检测、实时辅助计划和回答记忆，减少同一问题反复生成。
- 支持双音源转写、说话人判断和主动提示，并保留手动触发能力。

### 项目知识

- 新增本地项目索引、源码检索和关系图，可把代码证据带入回答。
- 新增外部知识源配置及连通性检查，Key 继续使用系统加密存储。
- 增加发送前脱敏和引用范围控制，避免无关文件或敏感内容进入模型请求。

### 界面与隐蔽性

- 重做首页与设置页，减少信息拥挤并突出截图解题、语音面试和输入区。
- 整体、窗口、文字和图标透明度可分别调节；UI 字号与回答字号可独立设置。
- 支持隐藏 Dock 图标、红绿灯常驻隐藏或悬停显示、鼠标穿透和窗口外观重置。
- 新增新建会话、聚焦输入框、Dock 图标切换等快捷键。
- 支持多显示器截图目标选择，并改进截图尺寸和历史记录处理。

### 稳定性

- 打包前检查是否仍有仓库内的 Penumbra 正在运行，避免旧进程读取新资源。
- 错误页限制第三方异常文本长度，不再整屏显示压缩后的依赖源码。
- 新增回答协议、配置安全、窗口外观、项目索引和实时辅助等回归测试。
