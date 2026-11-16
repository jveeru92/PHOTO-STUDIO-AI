import { useLocation } from 'react-router-dom';
import { Bell, HelpCircle, Maximize, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';

export default function Topbar({
  openMobileDrawer,
}: {
  openMobileDrawer: () => void;
}) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { providerQuota, refreshQuota } = useApp();

  const breadcrumb = (() => {
    const labels: Record<string, string> = {
      '/': 'Dashboard',
      '/passport': 'Passport Studio',
      '/editor': 'Normal Photo Editor',
      '/background': 'Background Editor',
      '/projects': 'Recent Projects',
      '/settings': 'Settings',
    };
    return labels[location.pathname] || 'Studio';
  })();

  const anyExhausted = providerQuota.some((p) => p.available === false && p.lastError?.includes('quota'));

  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button
          onClick={openMobileDrawer}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded hover:bg-[var(--color-border)]/50 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1 text-sm font-medium text-[var(--color-text)]">
          <Maximize className="w-4 h-4 text-[var(--color-muted)]" />
          <span>{breadcrumb}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {anyExhausted && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-900/20 text-amber-200 text-xs border border-amber-900/30">
            <span>Free AI quota exhausted</span>
          </div>
        )}
        <button
          onClick={refreshQuota}
          aria-label="Refresh usage"
          className="p-2 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-border)]/50 transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
          title="Refresh provider usage"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-border)]/50 transition hidden md:block focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <button
          aria-label="Help"
          className="p-2 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-border)]/50 transition hidden md:block focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
