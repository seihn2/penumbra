# Penumbra · 编码面试解题与实时应答助手

Penumbra 是一款面向中文用户的桌面端 AI 面试 / 笔试辅助工具。它能截取屏幕上的题目交给大模型实时解题，也能实时转写面试对话、识别面试官的提问并即时生成应答要点。窗口为**置顶半透明悬浮层**，并对屏幕共享软件**隐身**——即便被要求共享屏幕，对方也看不到它的界面。

> 基于 Electron 37 + React 19 构建，适配国内 AI 生态（兼容任意 OpenAI 协议接口），开箱即用。

---

## 目录

- [适用场景](#适用场景)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [默认快捷键](#默认快捷键)
- [架构概览](#架构概览)
- [开发指南](#开发指南)
- [macOS 系统音频与权限](#macos-系统音频与权限)
- [隐身能力说明](#隐身能力说明)
- [许可协议](#许可协议)

---

## 适用场景

- **编程面试**：分析屏幕上的题目，实时给出思路与代码；即使共享屏幕也不会被发现。
- **在线笔试**：窗口不抢占焦点，不会触发「跳出网页 / 切屏」检测。
- **实时口语面试**：转写面试官语音，自动识别问题并流式给出应答要点，支持中 / 英 / 日 / 韩 / 法。
- **其他场景**：通过「自定义提示词」可扩展到英语机试、知识问答等。

---

## 核心功能

### 截图解题

- 全局快捷键一键截屏 → 视觉模型分析 → 流式返回解题思路与代码。
- 支持**多截图续拍**（追加到同一会话）与**追问**。
- 算法题模式给出代码 + 复杂度 + 边界分析；通用模式回答任意题型。
- 会话历史归档、恢复、导出为 Markdown。

### 实时语音转写与面试教练

基于阿里云百炼 **Fun-ASR** 实时语音识别，构建了一套面试陪练能力：

- **实时转写**：WebSocket 流式识别，自动断线重连。
- **双音源说话人区分**：系统音频标记为「面试官」、麦克风标记为「我」，分两路独立识别。
- **实时 AI 应答辅助**：检测到面试官的**提问**后（多语言疑问识别，过滤填充语省 token），按可调防抖延迟流式生成应答要点；也可手动一键求助。
- **主动陪聊（Vibe 模式）**：无需提问、无需按键，每隔约 20 秒根据对话走向主动给提示——结合你的简历项目、相关 SOTA 技术、应答要点与反问建议。
- **实时翻译**：对每个定稿句子调用模型翻译，内联展示在转写下方。
- **话题摘要 / 对话时间线 / 发言占比统计**：辅助复盘。
- **转写导出**：整段对话 + AI 辅助可导出 Markdown 供面试后复盘。

### 窗口与隐身

- 透明、无边框、置顶、可鼠标穿透的悬浮窗。
- 对屏幕共享 / 录制软件隐身（`setContentProtection`）。
- 全局快捷键调节三层透明度（整体 / 窗口 / 文字）、移动窗口、复位窗口。

### 其他

- **多语言 UI**：简体中文、English、日本語、한국어、Français。
- **任意 OpenAI 兼容接口**：OpenAI / 硅基流动 / DeepSeek / OpenRouter / 火山 / 智谱 等，内置常用平台 Base URL 预填。
- **个人记忆**：可填入简历 / 背景材料（支持导入 PDF），用于个性化应答。
- 密钥经主进程 `safeStorage` 加密存储，不落 localStorage。

---

## 快速开始

> 依赖 [Node.js](https://nodejs.org/zh-cn/download)。也可直接下载安装包，参见项目 Wiki。

```bash
npm install     # 安装依赖
npm run dev     # 开发模式启动
```

启动后进入「设置」页面，填写 `API Base URL` 与 `API Key` 即可开始截图解题。

---

## 配置说明

### AI 模型

在「设置 → 模型」中配置，或在项目根目录建 `.env` 预置默认值：

```env
API_BASE_URL="https://openrouter.ai/api/v1"   # 任意 OpenAI 兼容接口
API_KEY="sk-..."                                # 你的密钥
MODEL="gpt-5.6-sol"                             # 可选：覆盖默认模型
CODE_LANGUAGE="typescript"                      # 可选：默认代码语言
DASHSCOPE_API_KEY="sk-..."                      # 可选：实时语音转写密钥
ASR_MODEL="qwen-audio-3.0-asr-flash-streaming" # 可选：ASR 模型（推荐）
```

`.env` 仅作为初始默认值；用户在应用内的设置会持久化并优先生效。

### 语音转写（可选）

1. 在[百炼平台](https://help.aliyun.com/zh/model-studio/get-api-key)注册并创建 API Key。
2. 在「设置 → 语音转录」填入 DashScope API Key。
3. 用快捷键 `⌘/Ctrl+Shift+T` 开始 / 暂停转写。

> 默认使用 Qwen-Audio 3.0 实时模型。旧版 Fun-ASR / Paraformer 与 Qwen3-ASR
> Realtime 仍可在设置中选择，建议先用「测试连接」确认当前 Key 与地域可用。

---

## 默认快捷键

`Alt` 在 macOS 上为 `Option`。

| 功能                | 快捷键                            |
| ------------------- | --------------------------------- |
| 截图解题            | `Alt+Enter`                     |
| 追加截图            | `Alt+Shift+Enter`               |
| 停止 AI 输出        | `Alt+.`                         |
| 开始 / 暂停语音转写 | `⌘/Ctrl+Shift+T`               |
| 清空转写            | `Alt+Shift+T`                   |
| 显示 / 隐藏窗口     | `Alt+H`                         |
| 复位窗口（防误置）  | `Alt+0`                         |
| 鼠标穿透开关        | `Alt+M`                         |
| 整体透明度 ±       | `Alt+=` / `Alt+-`             |
| 窗口透明度 ±       | `Alt+]` / `Alt+[`             |
| 文字透明度 ±       | `Alt+Shift+]` / `Alt+Shift+[` |
| 上下滚动            | `⌘/Ctrl+J` / `⌘/Ctrl+K`     |
| 移动窗口            | `⌘/Ctrl+方向键`                |

快捷键均可在「设置 → 快捷键」中自定义。

---

## 架构概览

Electron 三进程模型，详见 [docs/architecture.md](docs/architecture.md)。

```
┌──────────────────────────────────────────────┐
│ Main 进程 (src/main/)                          │
│  index.ts        入口 / getDisplayMedia handler│
│  main-window.ts  透明置顶窗口 / 隐身            │
│  shortcuts.ts    全局快捷键 + 会话 IPC          │
│  ai.ts           Vercel AI SDK 流式调用         │
│  transcription/  ASR 协调 + 双音源 + 面试教练   │
├──────────────────────────────────────────────┤
│ Preload  contextBridge → window.api            │
├──────────────────────────────────────────────┤
│ Renderer (src/renderer/) React 19 + Zustand    │
│  coder/    主对话流 + 转写栏 + 面试教练面板     │
│  settings/ 设置页   help/ 帮助页                │
└──────────────────────────────────────────────┘
```

**截图解题数据流**：快捷键 → 截屏(base64) + 附带转写文本 → `ai.ts` `streamText()` → `solution-chunk` 事件流式回传 → 渲染端 Markdown 累积渲染。

**语音转写管线**：渲染端采集音频(系统 loopback + 麦克风)→ IPC 音频块 → DashScope WebSocket → `TranscriptBuffer`(双音源加说话人前缀)→ `InterviewCoachService`(阶段分析 / 应答辅助 / 翻译 / 摘要)→ 推送渲染端。

---

## 开发指南

### 技术栈

| 层     | 技术                                                           |
| ------ | -------------------------------------------------------------- |
| 框架   | Electron 37（electron-vite 4 / Vite 7）                        |
| 前端   | React 19、TypeScript 5.8                                       |
| 样式   | Tailwind CSS v4、Radix UI、shadcn/ui                           |
| 状态   | Zustand 5（settings / shortcuts / chat 持久化）                |
| 路由   | react-router v7（HashRouter）                                  |
| AI     | Vercel AI SDK（`ai` + `@ai-sdk/openai`），`streamText()` |
| 转写   | DashScope 实时 ASR（WebSocket，`ws`）                        |
| 国际化 | i18next + react-i18next（5 语言）                              |
| 测试   | Vitest（200 项单元测试）                                       |
| 构建   | electron-vite + electron-builder 25                            |

### 常用命令

```bash
npm run dev          # 开发模式
npm run build        # 类型检查 + 构建
npm run build:mac    # 打包 macOS
npm run build:win    # 打包 Windows
npm run build:linux  # 打包 Linux
npm run typecheck    # TypeScript 类型检查（node + web）
npm run lint         # ESLint
npm run format       # Prettier
npm test             # 运行 Vitest 测试
```

### 代码风格

- Prettier：单引号、无分号、100 字符宽、无尾逗号。
- 用户可见文案用**中文**；代码注释与标识符用**英文**。
- `src/shared/` 下为纯函数领域逻辑，配有单元测试。

---

## macOS 系统音频与权限

实时转写采集系统音频（面试官声音）依赖 **屏幕录制权限**：

1. 首次开启「双音源转写」时，macOS 会弹出屏幕录制授权请求。
2. 到「系统设置 → 隐私与安全性 → 屏幕录制」勾选 Penumbra。
3. **完全退出并重开应用**（TCC 授权需重启进程才生效）。
4. macOS 14.2+ 原生支持系统音频 loopback，**无需 BlackHole**。仅在仍抓不到声音时，才考虑用 BlackHole 虚拟声卡并在设置里选择它。

> macOS 在采集系统音频时会强制显示「正在录制屏幕」的隐私指示器，这是系统行为，应用无法关闭。

### 关于代码签名（自行打包 macOS 版）

无 Apple 开发者证书时，构建会用 ad-hoc 签名，其哈希每次打包都变，导致 macOS 把每次重打包当作新应用、**屏幕录制授权反复失效**。本项目提供一次性脚本创建稳定的本机自签名证书：

```bash
bash scripts/create-signing-cert.sh   # 在登录钥匙串创建 "Penumbra Local Signing"
npm run build:mac
```

`afterPack` 钩子（`scripts/after-pack-mac-sign.cjs`）会在打包后用该稳定身份重签名（标识符固定为 `com.penumbra.app`、嵌入音频 entitlements），使授权在重打包后依然保留。配置了真实签名身份（`CSC_LINK` / `CSC_NAME`）时该钩子自动跳过。

---

## 隐身能力说明

隐身功能适配市面上大部分会议软件（如腾讯会议、Zoom 等），但极少数软件 / 浏览器可能无法正常隐身。**使用前请自行测试**，本项目不承担任何责任。相关问题欢迎提 Issue 讨论。

隐身默认开启，可在「设置 → 隐私」中关闭。若窗口出现异常（如只见红绿灯 / 一片透明），按 `Alt+0` 复位。

---

## 许可协议（License）

本项目采用 **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh)** 协议。

您可以自由使用、复制、修改本项目代码，但**禁止任何形式的商业用途**（包括售卖、集成入商业产品、SaaS 服务等）。如需商业授权，请联系作者获得书面许可。

---

## 致谢与同类项目

Penumbra 基于 Gavin Wang（[@ooboqoo](https://github.com/ooboqoo)）的「编码面试解题助手」项目演进而来，在其截图解题能力之上扩展了实时语音转写、面试教练、多语言等功能。感谢原作者的开创性工作。

原项目同样受 [Interview-Coder](https://github.com/ibttf/interview-coder) 启发。其他同类项目：

- https://github.com/sohzm/cheating-daddy
- https://github.com/pickle-com/glass
- https://github.com/j4wg/interview-coder-withoupaywall-opensource
