export function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      <div className="w-12 h-12 border-4 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">Loading PHOTO STUDIO AI</h2>
      <p className="text-sm text-[var(--color-muted)]">Preparing your photo studio...</p>
    </div>
  );
}

export function AppError({ error, retry }: { error: Error | null; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-600">⚠</span>
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Something went wrong</h2>
      {error && (
        <p className="text-sm text-[var(--color-muted)] mb-4 max-w-md">
          {error.message}
        </p>
      )}
      <button
        onClick={retry}
        className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-studio-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
