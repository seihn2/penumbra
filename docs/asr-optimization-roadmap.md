# ASR Optimization Roadmap

Updated: 2026-08-05

## Goals

- Improve mixed Chinese-English technical-term recognition.
- Reduce question-finalization and first-assist latency.
- Keep long interview sessions stable across silence and weak networks.
- Make model capabilities explicit so future models do not require protocol guesswork.

## Completed

1. Added Qwen-Audio 3.0 and pinned snapshots, with family-aware protocol routing.
2. Unified the connection probe and runtime parameter builders.
3. Enabled heartbeat for Qwen-Audio 3.0 long-silence sessions.
4. Added a Chinese-English transcription preset. Qwen-Audio receives both language hints;
   single-language providers use one hint, while Qwen3 mixed-language mode falls back to auto-detect.

## Prioritized Backlog

### P0 — Stability and Accuracy

1. **Workspace-specific WebSocket domains**
   - Add Beijing/Singapore region and optional Workspace ID settings.
   - Prefer the business-space domain recommended by Alibaba Cloud for lower latency and better
     stability, while retaining the public endpoint as a fallback.
2. **Opt-in technical vocabulary and ASR context**
   - Add a dedicated vocabulary field rather than silently sending the full user profile.
   - Map stable terms to `vocabulary_id`, session terms to `vocabulary`, and recent safe context to
     `input.context` / `continue-task`.
3. **ASR latency telemetry**
   - Record socket-open, task-started, first partial, first final, and reconnect timings.
   - Surface aggregate first-text and finalization latency in the existing session diagnostics.

### P1 — Interview Responsiveness

1. **Source-aware VAD**
   - Finalize interviewer/system turns faster than candidate/microphone turns.
   - Tune `max_sentence_silence` and Qwen3 `silence_duration_ms` by source with safe bounds.
2. **Qwen3 metadata propagation**
   - Preserve detected language and emotion from realtime events.
   - Display them in the timeline and only use emotion for coach logic after confidence testing.
3. **Model-aware automatic fallback**
   - Retry transient failures on the same model first.
   - Offer explicit fallback to Fun-ASR instead of silently changing model/cost semantics.

### P2 — Larger Protocol Work

1. **AOQ transport evaluation** for mobile/weak-network echo cancellation and stable latency.
2. **8 kHz telephony mode** with explicit resampling; do not expose it in the current 16 kHz UI.
3. **LiveTranslate integration** as a separate translation provider, not as a drop-in ASR model.

## Official References

- https://help.aliyun.com/zh/model-studio/asr-model
- https://help.aliyun.com/zh/model-studio/fun-asr-client-events
- https://help.aliyun.com/zh/model-studio/real-time-speech-recognition-business-exclusive-domain-name
- https://help.aliyun.com/zh/model-studio/real-time-speech-recognition-AOQ-api-reference
