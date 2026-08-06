# Final Regression Checklist

Use this checklist before treating the local refactor branch as ready for regular use.

## Static Gates

```bash
cd penumbra
git switch local/asr-interview-coach
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit with code `0`.

## App Startup

```bash
npm run dev
```

Expected:

- App opens without renderer console errors.
- Header shows `Interview Coder` and `Practice Mode` on the coder page.
- Settings page opens and returns to the coder page.

## Model and Secret Settings

1. Open Settings → 模型服务.
2. Set `API Base URL`, `API Key`, and `Model`.
3. Create a custom model in the model combobox, select it, delete it, and confirm selection clears if the selected custom model is deleted.
4. Open Settings → 语音与面试教练 and set `百炼平台 API Key`.
5. Restart `npm run dev`.
6. Confirm both secret fields are restored.
7. Open DevTools → Application → Local Storage → `interview-coder-settings`.
8. Confirm `apiKey` and `dashscopeApiKey` are not persisted in renderer localStorage.
9. Open Settings → 隐私与安全 and confirm the `safeStorage` badge and configured secret count.

## Core Workbench

1. Confirm empty screenshot and answer cards show titled guidance.
2. Trigger screenshot capture.
3. Confirm screenshot appears in the timeline.
4. Trigger append screenshot.
5. Confirm multiple screenshots appear in order.
6. Start an AI answer and confirm streaming output appears in `解题输出`.
7. Stop generation and confirm loading state clears.
8. Send a follow-up question through the status bar dialog.
9. Trigger or simulate an API error and confirm the error banner has a troubleshooting hint and close button.

## Shortcuts

1. Open Settings → 快捷键.
2. Change one shortcut and confirm it updates in the list.
3. Open Help → 快捷键 and confirm the same label/category appears there.
4. Reset default shortcuts and confirm the changed shortcut reverts.
5. Verify page up/down shortcut scrolling on the coder page.
6. Verify mouse passthrough shortcut changes the bottom status indicator.

## ASR and Interview Coach

1. Disable `双音源说话人区分`.
2. Start transcription and confirm realtime text appears.
3. Enable `AI 实时翻译`, choose a target language, and confirm translations appear for finalized sentences.
4. Enable `双音源说话人区分`.
5. Start transcription and confirm microphone permission flow if needed.
6. Confirm system audio is labeled as interviewer and microphone audio as candidate.
7. Confirm Interview Coach shows stage, speaker, confidence, suggestions, recent turns, and translations.

## Local Version Management

```bash
# inspect local checkpoints
git log --oneline -20

# compare against original branch
git diff --stat main..local/asr-interview-coach

# return to original branch if needed
git switch main

# return to refactored branch
git switch local/asr-interview-coach
```
