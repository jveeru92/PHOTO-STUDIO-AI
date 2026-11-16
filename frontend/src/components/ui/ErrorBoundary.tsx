import { Component, ErrorInfo, ReactNode } from 'react';

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

  static getDerivedStateFromError(error: Error, state: ErrorBoundaryState): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: state?.retryCount ?? 0,
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
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          {error && (
            <p className="text-sm text-[var(--color-muted)] mb-4">{error.message}</p>
          )}
          {errorInfo && errorInfo.componentStack && (
            <details className="text-xs text-[var(--color-muted)] text-left w-full mb-4">
              <summary>Diagnostic details</summary>
              <pre className="bg-[var(--color-neutral-100)] p-3 overflow-auto mt-2">{errorInfo.componentStack}</pre>
            </details>
          )}
          <button
            onClick={this.retry}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-studio-700 transition"
          >
            Retry (attempt {retryCount + 1})
          </button>
        </div>
      );
    }

    return children;
  }
}
