/** A screenshot/transcription failure is almost always a missing macOS Screen
   Recording permission. Detect those messages so the UI can offer a one-click
   shortcut to the system settings pane. */
export function isScreenPermissionError(message: string | null | undefined): boolean {
  if (!message) return false
  return (
    message.includes('屏幕录制权限') ||
    message.includes('系统音频权限') ||
    /screen recording permission/i.test(message)
  )
}
