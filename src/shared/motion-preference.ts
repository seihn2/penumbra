/** Pure motion-preference resolution for the accessibility baseline (P1#33).

   The app animates streamed answers, panel transitions, and the transcription
   overlay. Users who set "reduce motion" at the OS level (vestibular disorders,
   focus needs) should get those animations neutralized. This module resolves
   the effective preference from the OS signal plus an optional in-app override,
   and derives a transition duration to apply.

   Pure: no IO, no clock, no randomness, no DOM. The caller reads
   `matchMedia('(prefers-reduced-motion: reduce)')` and passes the boolean in. */

/** In-app override. 'system' defers to the OS; the others force the choice so a
   user can opt into full motion even on a reduced-motion OS, or vice versa. */
export type MotionPreference = 'system' | 'reduce' | 'full'

export const MOTION_PREFERENCES: MotionPreference[] = ['system', 'reduce', 'full']

/** Whether motion should be reduced, given the in-app override and whether the
   OS reports `prefers-reduced-motion: reduce`. 'system' follows the OS; an
   explicit override wins over the OS either way. Unknown values fall back to
   'system' so a corrupted setting never disables the OS signal. */
export function resolveReduceMotion(
  preference: MotionPreference,
  systemPrefersReduce: boolean
): boolean {
  if (preference === 'reduce') return true
  if (preference === 'full') return false
  return systemPrefersReduce
}

/** The transition duration (ms) to apply for the resolved preference. Reduced
   motion collapses to a near-instant 1ms (not 0 — a tiny non-zero value keeps
   transitionend handlers firing) so JS that waits on transitions still resolves. */
export function motionDurationMs(reduce: boolean, fullMs: number): number {
  return reduce ? 1 : fullMs
}
