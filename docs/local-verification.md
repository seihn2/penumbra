# Local Verification Guide

This project is managed locally with Git. No remote push is required.

## 1. Switch Versions

```bash
cd penumbra

# Original upstream version
git switch main

# Refactored local version
git switch local/asr-interview-coach
```

## 2. Basic Static Checks

Run these after every refactor checkpoint:

```bash
npm run typecheck
npm run build
```

Expected result: both commands exit with code `0`.

## Refactor Checkpoints

Current local branch checkpoints:

- `61070f4` — ASR interview coach, dual-source transcription, AI translation.
- `28700d8` — extracted window visibility/move controls from shortcuts.
- `c811f70` — extracted AI stream lifecycle into `StreamManager`.
- `6419371` — extracted screenshot/follow-up conversation state into `AiConversationService`.
- `1719f59` — added runtime IPC validation for settings, state, shortcuts, follow-up, and ASR source inputs.
- `9aa8294` — refreshed the main Workbench UI layout, header, status bar, screenshot timeline, and answer panel.
- latest — reorganized Settings into model, voice coach, translation, appearance, shortcuts, storage, and privacy sections.
- latest — moved API keys out of renderer localStorage and into main-process controlled secure storage.
- latest — extracted renderer/main-process settings synchronization out of the root `App` component.
- latest — extracted the coder-page transcription lifecycle into a dedicated renderer hook.
- latest — extracted coder-page body opacity and app-state IPC side effects into small hooks.
- latest — split the Settings page into focused section components and shared setting-row primitives.
- latest — centralized supported language options for renderer selects and main-process IPC validation.
- latest — tightened renderer settings types for transcription language, translation language, and diarization mode.
- latest — added focused settings selector hooks to reduce unnecessary renderer re-renders.
- latest — added an in-app privacy/security summary that explains how to verify secret storage locally.
- latest — added focused solution/transcription selector hooks to avoid subscribing UI components to whole stores.
- latest — extracted solution IPC listeners and page-scroll shortcut listeners out of `AppContent`.
- latest — added app/shortcut selector hooks and extracted follow-up question behavior from `AppStatusBar`.
- latest — centralized shortcut display metadata and polished empty/error states in the main workbench.
- latest — split status-bar UI into focused components and documented renderer/main/store architecture boundaries.
- latest — split model/shortcut settings internals and added a final regression checklist.
- latest — split language/prerequisite setup internals and brought full-project lint to green.

## 3. Start the App Locally

```bash
npm run dev
```

Then configure these in the app settings:

- AI Settings: `API Base URL`, `API Key`, `Model`.
- Transcription: DashScope API Key.
- Optional: enable `面试练习教练`.
- Optional: enable `双音源说话人区分`.
- Optional: enable `AI 实时翻译` and choose target language.

## 4. Verify Core Desktop Behavior

On the coder page:

1. Toggle show/hide window shortcut.
2. Move the window with directional shortcuts.
3. Toggle mouse passthrough.
4. Capture a screenshot and confirm it appears in the UI.
5. Append a second screenshot and confirm the screenshot strip updates.
6. Stop generation while an AI stream is running.
7. Send a follow-up question after a generated answer.

UI-specific checks:

1. Header should show `Interview Coder` and `Practice Mode`.
2. Empty state should show titled capture guidance inside the screenshot timeline and answer cards.
3. After screenshot capture, screenshots should appear as a vertical timeline.
4. Answer content should stream inside the `解题输出` card.
5. API errors should show a short troubleshooting hint and a close button.
6. Bottom status bar should remain visible and follow-up button should still work.

## 4.1 Verify IPC Validation Smoke Cases

These checks are mostly defensive; normal UI paths should still behave the same.

1. Open settings and toggle several switches, then return to the coder page.
2. Change shortcut settings and confirm existing shortcuts still register.
3. Send an empty follow-up question from the UI; the dialog should prevent submission.
4. Start transcription in single-source mode and then dual-source mode.
5. Confirm invalid settings are not needed in normal use; schema validation protects main-process handlers from malformed renderer payloads.

Settings UI checks:

1. Open Settings and confirm cards are grouped by 模型服务、语音与面试教练、翻译与回答策略、外观、快捷键、存储、隐私与安全。
2. Toggle AI realtime translation and confirm target language appears/disappears.
3. Toggle screenshot saving and confirm directory picker row appears/disappears.
4. Toggle custom prompt and confirm programming language selector is replaced by prompt textarea.

Security storage checks:

1. Open Settings and enter both `API Key` and `百炼平台 API Key`.
2. Reload the app or quit and restart `npm run dev`.
3. Confirm both secret fields are still populated after restart.
4. Open DevTools → Application → Local Storage → `interview-coder-settings`.
5. If upgrading from an older local version, confirm old localStorage keys are migrated into the app once.
6. Confirm persisted settings no longer contain `apiKey` or `dashscopeApiKey` after the app syncs settings.
7. Confirm non-secret settings such as model, opacity, language, translation target, and shortcut choices still persist.
8. Confirm Settings → 隐私与安全 shows the `safeStorage` badge and configured secret count.

## 5. Verify ASR and Interview Coach

Single-source mode:

1. Disable `双音源说话人区分`.
2. Start transcription.
3. Play or speak a short interview-style question.
4. Confirm realtime transcript appears.
5. Confirm Interview Coach shows stage, speaker, confidence, and suggestions.

Dual-source mode:

1. Enable `双音源说话人区分`.
2. Start transcription.
3. Confirm the OS asks for microphone permission if needed.
4. Play interviewer audio through the computer/system audio.
5. Speak candidate audio into the microphone.
6. Confirm system audio is labeled `面试官 / Provider`.
7. Confirm microphone audio is labeled `候选人 / Provider`.

Translation:

1. Enable `AI 实时翻译`.
2. Choose a target language.
3. Speak or play a complete sentence.
4. Confirm translation appears only after finalized transcript sentences.

## 6. Compare Original vs Refactored Behavior

```bash
# Review commits
git log --oneline --decorate --graph --all -5

# Show ASR coach checkpoint
git show --stat 61070f4

# Show latest local changes on current branch
git diff --stat main..local/asr-interview-coach
```

## 7. Roll Back Locally

```bash
# Go back to original version without deleting work
git switch main

# Return to refactored version
git switch local/asr-interview-coach
```

If you want to discard all refactor work permanently:

```bash
git branch -D local/asr-interview-coach
```

Use that only after confirming you no longer need the local branch.
