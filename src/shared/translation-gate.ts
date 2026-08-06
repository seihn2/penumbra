import type { SupportedLanguageCode } from './languages'

/** Detect the dominant script of a short transcript line. Mirrors the order in
   interview-coach's detectLanguage (kana/hangul before Han so Japanese isn't
   misread as Chinese). Returns null when no script is confidently identified —
   callers should treat null as "unknown", not as any specific language. */
function detectScriptLanguage(text: string): SupportedLanguageCode | null {
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[一-鿿]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text)) return 'en'
  return null
}

/** Decide whether a finalized transcript line needs translation to the target
   language. Skips only when the detected source language is confidently the
   SAME as the target (e.g. a Chinese line with a Chinese target), which would
   otherwise burn tokens and clutter the UI with a same-language "translation".

   Conservative by design: when the script can't be identified (null) or the
   detected language differs from the target, we translate. Latin-script
   languages (en/es/fr/de) all detect as 'en' here, so this only suppresses the
   en→en case among them — it never wrongly skips a real cross-language pair
   like en→fr (target fr, detected en → differs → translate).

   `target` is typed as a plain string because the main-process settings object
   widens it; an unrecognized target simply never equals a detected language,
   so the conservative "translate" path is taken. */
export function shouldTranslateText(text: string, target: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const detected = detectScriptLanguage(trimmed)
  if (detected === null) return true
  return detected !== target
}
