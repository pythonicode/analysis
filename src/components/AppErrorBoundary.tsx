import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches uncaught render errors anywhere in the app tree. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <div className="app-error-boundary-card">
            <h2>Something went wrong</h2>
            <p>
              O-Analysis ran into an unexpected error. Reloading the page usually
              fixes this.
            </p>
            <button
              type="button"
              className="app-error-boundary-reload"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
