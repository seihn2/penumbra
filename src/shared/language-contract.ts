// End-to-end language contract.
//
// The app historically conflated languages, so Assist/summary/Coach output
// tended to always be Chinese. This module keeps the six language axes SEPARATE
// and pure (no Date.now / Math.random / IO), so behavior is deterministic and
// testable:
//   - ui:                which language the interface chrome is shown in
//   - transcription:     which language incoming speech is transcribed as
//   - answer:            which language AI answers are written in
//   - translationTarget: which language live translation renders into
//   - export:            which language the exported transcript is written in
//   - programming:       which programming language solutions are written in
//
// The answer language defaults to FOLLOW the current question's language and
// must NOT auto-switch within a single problem.

// BCP-47-ish language code, e.g. 'zh', 'en', 'ja', 'ko', 'fr', 'ru', 'auto'.
// 'und' means "undetermined" (empty or script-less input).
export type LangCode = string

export interface LanguageContract {
  ui: LangCode
  transcription: LangCode
  // 'follow-question' => derive the answer language from the current question.
  answer: LangCode | 'follow-question'
  translationTarget: LangCode
  // 'original' => keep the user's own words, do not auto-translate on export.
  export: LangCode | 'original'
  programming: string
}

// Detect the language of a piece of text with a simple script heuristic.
//
// Kana and hangul are checked BEFORE Han on purpose: Japanese text mixes kana
// with Han characters, so testing Han first would misclassify Japanese as
// Chinese. This mirrors the existing convention in src/shared/interview-coach.ts.
export function detectLanguage(text: string): LangCode {
  if (text.trim().length === 0) return 'und'
  if (/[\u3040-\u30ff]/.test(text)) return 'ja'
  if (/[\uac00-\ud7af]/.test(text)) return 'ko'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
  if (/[\u0400-\u04ff]/.test(text)) return 'ru'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'und'
}

// Resolve the language the answer should be written in.
//
// When answer is 'follow-question' the language is derived from the question
// text, falling back to the UI language when the question is undetermined.
// Otherwise the explicitly configured answer language wins.
export function resolveAnswerLanguage(contract: LanguageContract, questionText: string): LangCode {
  if (contract.answer !== 'follow-question') return contract.answer
  const detected = detectLanguage(questionText)
  return detected === 'und' ? contract.ui : detected
}

// Resolve the language the export should be written in.
//
// 'original' keeps the user's own words (the language they actually spoke),
// otherwise the explicitly configured export language wins.
export function resolveExportLanguage(
  contract: LanguageContract,
  originalLang: LangCode
): LangCode {
  if (contract.export !== 'original') return contract.export
  return originalLang
}

// Within one problem the answer language must NOT auto-switch. This constant
// rule function documents that invariant for callers and tests.
export function shouldAutoSwitchWithinProblem(): false {
  return false
}

// Pick a stable answer language for a single problem.
//
// The language is derived from the FIRST question and stays fixed even if a
// later line in the same problem looks like another language, so a stray
// English clarification (or vice versa) never flips the whole answer language
// mid-problem. The laterQuestionText argument is intentionally ignored; it is
// accepted to make the "no mid-problem switch" contract explicit at call sites.
export function stableAnswerLanguage(
  contract: LanguageContract,
  firstQuestionText: string,
  laterQuestionText: string
): LangCode {
  // Intentionally ignored: a later line must never flip the answer language
  // mid-problem, so only the first question drives the result.
  void laterQuestionText
  return resolveAnswerLanguage(contract, firstQuestionText)
}

// Language for Assist / summary / Coach output.
//
// These must FOLLOW the resolved answer language rather than hardcoding
// Chinese, so an English question yields English assist output.
export function assistLanguageFor(contract: LanguageContract, questionText: string): LangCode {
  return resolveAnswerLanguage(contract, questionText)
}

// Pick a sensible default translation target for a given UI language: Chinese
// UIs translate into English, everything else translates into Chinese.
function defaultTranslationTarget(ui: LangCode): LangCode {
  return ui === 'zh' ? 'en' : 'zh'
}

// Build a default contract. The answer follows the question, the export keeps
// the user's original words, and the translation target is derived from the UI
// language.
export function createDefaultContract(ui: LangCode = 'zh'): LanguageContract {
  return {
    ui,
    transcription: 'auto',
    answer: 'follow-question',
    translationTarget: defaultTranslationTarget(ui),
    export: 'original',
    programming: 'typescript'
  }
}
