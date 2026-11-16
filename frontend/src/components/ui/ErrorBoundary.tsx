import { Component, ErrorInfo, ReactNode, createElement } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, resetKeys } = this.props;

    if (resetKeys) {
      // Simple reset key comparison
      const currentKey = JSON.stringify(resetKeys);
      if (currentKey !== (this._lastResetKey ?? null)) {
        this._lastResetKey = currentKey;
        this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
      }
    }

    if (hasError) {
      if (fallback) return fallback;
      return (
        createElement('div', {
          className:
            'flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg',
        }),
        createElement('h2', { className: 'text-xl font-bold text-red-600 mb-2' }, 'Something went wrong'),
        error && (
          createElement('p', { className: 'text-sm text-[var(--color-muted)] mb-4' }, error.message)
        ),
        errorInfo && errorInfo.componentStack && (
          createElement('details', { className: 'text-xs text-[var(--color-muted)] text-left w-full mb-4' },
            createElement('summary', null, 'Diagnostic details'),
            createElement('pre', { className: 'bg-[var(--color-neutral-100)] p-3 overflow-auto mt-2' }, errorInfo.componentStack)
          )
        ),
        createElement('button', {
          onClick: this.retry,
          className: 'px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-studio-700 transition',
        }, `Retry (attempt ${retryCount + 1})`)
      );
    }

    return children;
  }

  private _lastResetKey: string | null = null;
}
