import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'

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
            <h2>{t('error.title')}</h2>
            <p>{t('error.body')}</p>
            <button
              type="button"
              className="app-error-boundary-reload"
              onClick={this.handleReload}
            >
              {t('error.reload')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
