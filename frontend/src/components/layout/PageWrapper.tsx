import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useState } from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  pageName: string;
  resetKeys?: any;
}

export function PageWrapper({ children, pageName }: PageWrapperProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-600">⚠</span>
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">{pageName} encountered an error</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">{error.message}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-studio-700 transition"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(err) => {
        console.error(`Photo Studio AI - ${pageName} error:`, err);
        setError(err);
      }}
      resetKeys={pageName}
    >
      {children}
    </ErrorBoundary>
  );
}
