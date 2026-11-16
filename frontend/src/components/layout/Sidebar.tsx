import { useNavigate, useMatch } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Folder,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Folder,
  Settings,
};

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/passport', label: 'Passport Studio', icon: 'FileText' },
  { path: '/editor', label: 'Normal Photo Editor', icon: 'Image' },
  { path: '/background', label: 'Background Editor', icon: 'Layers' },
  { path: '/projects', label: 'Recent Projects', icon: 'Folder' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];

export default function Sidebar({
  mobileOpen,
  onMobileToggle,
}: {
  mobileOpen: boolean;
  onMobileToggle: () => void;
}) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileToggle();
  }, [navigate, onMobileToggle]);

  const handleCollapseToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleCloseMobile = useCallback(() => {
    onMobileToggle();
  }, [onMobileToggle]);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
    onMobileToggle();
  }, [navigate, onMobileToggle]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileToggle();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onMobileToggle]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar (always visible on lg+) */}
      <aside
        className={`fixed left-0 top-0 h-[100dvh] bg-[var(--color-surface)] border-r border-[var(--color-border)]
          text-[var(--color-text)] transition-all duration-300 z-40 flex flex-col w-20 lg:w-60
          ${isMobile ? 'hidden lg:block' : ''}`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-14 px-3 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight">
              PHOTO<span className="text-[var(--color-accent)]">STUDIO</span> AI
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCollapseToggle}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              className="p-2 rounded hover:bg-[var(--color-border)]/50 transition"
              title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <ChevronLeft className={`w-4 h-4 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded hover:bg-[var(--color-border)]/50 transition"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const match = useMatch(item.path);
            const Icon = iconMap[item.icon];
            const isActive = !!match;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'hover:bg-[var(--color-border)]/50 text-[var(--color-text)]'
                }`}
              >
                <div className="flex items-center justify-center w-6">
                  <Icon className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <span className={isActive ? 'font-semibold' : 'font-normal'}>
                    {item.label}
                  </span>
                )}
                {collapsed && (
                  <span className="absolute left-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 rounded-lg text-sm shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur shrink-0">
          {!collapsed && (
            <>
              <div className="text-xs text-[var(--color-muted)] mb-2">PHOTO STUDIO AI</div>
              <div className="text-xs text-[var(--color-muted)]">Zero-spend · Remote AI</div>
            </>
          )}
          {collapsed && (
            <div className="text-[var(--color-accent)] text-xs" title="PHOTO STUDIO AI — Zero-spend · Remote AI">
              PHOTO STUDIO AI
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && isMobile && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={handleCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-0 h-[100dvh] w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)]
              text-[var(--color-text)] z-50 flex flex-col lg:hidden transform transition-transform duration-300
              translate-x-0"
            aria-label="Mobile navigation drawer"
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="font-bold text-xl tracking-tight">
                PHOTO<span className="text-[var(--color-accent)]">STUDIO</span> AI
              </span>
              <button
                onClick={handleCloseMobile}
                aria-label="Close navigation"
                className="p-2 rounded hover:bg-[var(--color-border)]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const match = useMatch(item.path);
                const Icon = iconMap[item.icon];
                const isActive = !!match;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                        : 'hover:bg-[var(--color-border)]/50 text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={isActive ? 'font-semibold' : 'font-normal'}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="text-xs text-[var(--color-muted)] mb-2">PHOTO STUDIO AI</div>
              <div className="text-xs text-[var(--color-muted)]">Zero-spend · Remote AI</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
