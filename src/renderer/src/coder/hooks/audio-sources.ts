/** Decide which audio sources to attempt for transcription, given platform and
   the dual-source setting.

   - Microphone (candidate) is the only reliable path on macOS, where Electron's
     system-audio loopback is unsupported (Windows-only). So on macOS we always
     attempt the mic; system audio is only attempted when the user explicitly
     enables dual-source (e.g. they routed system audio via a virtual device).
   - On other platforms, single-source mode uses system audio; dual-source adds
     the mic. */
export function resolveAudioSources(
  isMac: boolean,
  dualSourceEnabled: boolean
): { wantSystemAudio: boolean; wantMic: boolean } {
  return {
    wantSystemAudio: dualSourceEnabled || !isMac,
    wantMic: isMac || dualSourceEnabled
  }
}
