# 需求总表 — Runtime Migration Handoff

Status snapshot (branch `local/asr-interview-coach`):

- **43 pure-logic modules** in `src/shared/` — the target data model, each fully unit-tested (1112 tests total, green).
- **49 runtime integrations** wired and committed (see "Done" below).
- **Remaining work** is the runtime-data-model migration + device-dependent items. This doc maps each remaining module to the concrete runtime rewrite needed, so a fresh session can pick up cleanly.

Why a fresh session: an earlier session developed a generation defect (runaway repeated filler before each tool call) tied to its very long context. Code landed correctly but the process was extremely inefficient. A new context clears it.

## Recently completed (this batch)

- **debrief-report (P2#44)** — `debriefTurnsFromTranscript()` derives DebriefTurns from the live coach transcript; `get-debrief-report` IPC + a debrief modal in the coach panel (duration/completion/unanswered/improvements/plan). Unobservable fields use neutral defaults, never fabricated data.
- **attention-event (P0#18)** — `audio-status` (previously dropped by the renderer) now flows through `audioAttentionEvents()` → `partition()`: full audio loss preempts with a critical toast; a terminal single-source drop is a low-priority warning; transient blips stay quiet.
- **live-session-state (P0#20)** — `hasReadyAnswer`/`candidateSpeaking` are now real signals from the coach service, so `deriveLivePhase` can reach its `ready`/`recording-answer` phases (were hardcoded false).
- **coach-layout LiveStateCapsule (P1#30)** — the coach panel header shows a live phase capsule (standby/listening/preparing/ready/recording-answer/audio-interrupted) with a phase-colored dot, polled via `useLiveSnapshot`.
- **answer-document copy-code (P1#25, partial)** — pure `answer-markdown` extracts fenced code from streamed answers; a "只复制代码" button appears when the answer has code. Full typed-block AnswerDocument (diff/rollback) still needs the AI to emit structured sections.
- **opportunity-brief (P2)** — `opportunity-brief-input` adapts the active memory profile + a pasted JD into structured inputs; a two-column header panel generates the brief.
- **mock-interview (P2#41)** — practice-mode panel with an AI interviewer (`generateMockQuestion`/`scoreMockAnswer`), graceful fallback to a tested question bank, driven by the pure mock-interview reducers.
- **answer-provenance (P0)** — `tagAnswerProvenance` AI path + pure `parseClaims`; a "可信度分析" button on each answer separates claims by provenance (facts vs assumptions vs inferences) via `separateByKind`.
- **coach-layout single-column (P1#30 full)** — the coach panel is now a single-column tabbed view (now/transcript/history/later) with count badges, driven by the pure coach-layout reducers; background arrivals never steal the active tab.
- **answer-document copy (P1#25)** — pure `answer-markdown` (copy-code-only + `splitSections`); "只复制代码" and "分块复制" (per-section) actions on answers.
- **spatial-presets (P1#32 core)** — pure window placement (center/corners/halves) + `clampToWorkArea`; `moveWindowBy` and the resetWindow recovery hatch reuse it; `snapWindowTo` available. Hot-plug/live multi-display still needs on-device verification.
- **contrast a11y (P1#33 core)** — pure WCAG contrast module; the accent-color picker warns when the accent is hard to read on the dark surface.
- **semver downgrade guard (P0#24 safety core)** — pure semver; the auto-updater only offers a strictly-newer build, so a rollback/misconfigured feed can't auto-downgrade. Signing/notarization/real-installer verification still needs a build machine.
- **answer-document live diff (P1#25 diff/rollback core)** — pure `answer-blocks-from-markdown` classifies streamed answer headings into typed BlockTypes (no core-prompt change), so answer-document's tested `diffRevisions`/`rollbackTo`/`undo` now work on live answers; a "对比上一版" button on each answer diffs it block-by-block against the previous one (added/removed/changed/unchanged). Stored typed-block streaming (AI-emitted sections) still needs a core-prompt change + on-device verification.

## Done — modules wired into the runtime (P0/P1)

| Module | Integration | Commit theme |
| --- | --- | --- |
| stream-throttle | chat DOM rows capped at 60 | P0#16 |
| sensitive-firewall | redact PII/secrets before AI send | P0#10 |
| language-contract | assist/proactive/summary follow interview language | P1#29 |
| question-machine (isStaleResponse concept) | stale/superseded assist guard | P0#5 |
| retry-policy | actionable error recovery hints on solution stream | P0#6 |
| config-dependency | translation-without-key warning + self-check dep check | P0#15 |
| outbound-intent | data-egress center: receipts + capsule UI | P0#9 |
| asset-ref | screenshot hash-dedup | P0#8 |
| secret-lifecycle | masked secret-status IPC | P0#14 |
| shortcut-scope | shortcut-conflict logging | P0#21 |
| history-index | searchable history panel | P1#36 |
| cost-budget | per-session usage/cost tracking | P1#35 |
| provider-profile | endpoint HTTPS-origin validation IPC | P0#13 |
| context-manifest | "what the AI remembers" inspection IPC | P0#7 |
| live-session-state | main-owned live status + reload recovery + assistInFlight | P0#2/#20 |
| profile-authorization | per-session profile-memory gate | P0#11 |
| recovery-plan | minimal-reset-scope IPC | P0#23 |
| self-check | one-click pre-interview check | P0 |

## Remaining — needs AI prompt change + on-device verification

- **answer-document (typed blocks)** → block-level copy, per-section copy, and
  block-level diff between revisions are done (P1#25): `answer-blocks-from-markdown`
  bridges streamed markdown into typed blocks so `diffRevisions`/`rollbackTo`/`undo`
  work live, surfaced as a "对比上一版" diff on each answer. The remaining slice is a
  stored typed-block AnswerDocument emitted *directly by the AI* (a core-prompt
  change) so rollback rewrites the live answer in place, which needs on-device
  streaming verification.

## Untouched — device-dependent (real-device verification required)

- Control-center / Overlay split (P1#31) — the pure control-surface partition is done: `control-surface` classifies each header control into the always-visible overlay (live-critical: mic / new / history / export / close) vs. a folded control center (setup tools: mock / brief / self-check / settings / help), context-filtered and order-stable. The header now renders both surfaces from it (a LayoutGrid popover for the center), shrinking the always-visible footprint during a shared screen. Further visual restructure (resizable panes, drag-out) is optional polish.
- Spatial presets & multi-display (P1#32) — placement math, clamp, AND hot-plug reconciliation are done & tested: `reconcileWindowToDisplays` decides, from the window rect + surviving work areas, whether the overlay is stranded and re-centers it on the best surviving display; `registerDisplayReconciliation` wires it to Electron's display add/remove/metrics-changed events so unplugging a monitor never loses the window. Confirming the physical hot-plug behavior on a real multi-monitor rig is the only remaining verification.
- Readability & a11y (P1#33) — contrast-warning, a keyboard focus-visible ring baseline, a reduce-motion preference, accessible names on every icon-only button across the whole renderer, custom-modal dialog semantics on all six overlays, an `aria-live`/`aria-busy` region on the streaming AI answer, landmark structure (banner + labelled toolbar + main + log), Escape-to-close on every custom overlay, AND focus restoration to the trigger when a modal closes (WCAG 2.4.3, via the shared `useModalDismiss` hook; the restore decision is a unit-tested pure helper) — all done and guarded by tests that scan the renderer so regressions fail fast. A final listen-through with an actual screen reader on-device is the remaining confirmation.
- Release/signing/notarization/stapling (P0#24) — the downgrade guard (semver), a release-preflight validator, AND a build gate are done: `release-preflight` checks appId/re-sign-identifier sync (TCC), required Info.plist audio keys, hardened-runtime entitlement coverage, notarization-vs-identity, and placeholder publish feeds; a repo-config guard test runs it in `npx vitest`, and `scripts/release-preflight.mjs` now runs it as `npm run preflight` — wired ahead of `build:mac`/`build:win`/`build:linux` so a config error blocks packaging before a build cycle is spent (warnings, e.g. the placeholder publish feed, are surfaced but non-blocking). The actual signing/notarization/stapling + installer testing still needs a build machine + Apple certs.
- Per-question-type workbenches (P2#43), coding workbench (P1#27) — question-type classifier + per-type answer scaffolds are done & tested (a typed question shows its type badge and a collapsible answer-framework checklist: coding / system-design / sql / behavioral / debugging). A full per-type workbench (scratchpad, live-editable code, run harness) is still a large on-device build.
- Quality benchmark harness (P2#46) — the health evaluator, sampler, AND a user-facing control panel are done: pure `soak-health` (`evaluateSoak`) turns a captured time-series (RSS, stuck-assist runs, reconnect rate, stalled-turns) into a pass/degraded/fail verdict; a main-process `soak-sampler` captures real samples every 5 min (opt-in, bounded) over IPC; and a `SoakPanel` in the control center lets a user start/stop sampling and read the evaluated verdict + issues without devtools. Running the actual 120-min soak on hardware and reading the verdict is the remaining step.

## Suggested next-session order

1. Device-dependent items with hands-on verification (signing, multi-display, a11y).
2. answer-document typed blocks (needs a core-prompt change; verify streaming on-device).
