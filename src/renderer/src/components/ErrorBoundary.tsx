import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches render/runtime errors anywhere in the React tree. Because the window
   is transparent, an uncaught error would otherwise leave a fully see-through
   window (the recurring "看不见" bug). This shows a SOLID, visible fallback with
   a one-click recovery (clear persisted state + reload) so the app can never
   silently vanish. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Renderer crashed:', error, info)
    // Persist the crash so it survives the reload and can be inspected/reported
    // even when DevTools wasn't open (the transparent overlay rarely has it).
    try {
      window.api?.asrDebugLog?.(
        `renderer crash: ${error.name}: ${error.message}\n${error.stack ?? ''}\n${info.componentStack ?? ''}`
      )
    } catch {
      // logging must never throw from the error path
    }
  }

  private handleReset = (): void => {
    try {
      // Corrupt persisted state is the most common cause; clear and reload.
      localStorage.clear()
    } catch {
      // ignore
    }
    location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            // Opaque so it's visible over the transparent window.
            background: '#0b0d10',
            color: '#e5e7eb',
            fontFamily: 'system-ui, sans-serif',
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>界面出错了 / Something went wrong</div>
          <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 360, lineHeight: 1.5 }}>
            点击下方按钮重置并恢复（会清除本地界面设置，密钥不受影响）。
          </div>
          {this.state.error && (
            <pre
              style={{
                fontSize: 11,
                opacity: 0.55,
                maxWidth: 420,
                maxHeight: 120,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                margin: 0
              }}
            >
              {this.state.error.name}: {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              borderRadius: 8,
              border: '1px solid #3b82f6',
              background: '#1d4ed8',
              color: '#fff',
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            重置并恢复 / Reset & Recover
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
