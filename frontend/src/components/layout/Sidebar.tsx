import { useNavigate, useLocation } from 'react-router-dom';
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
  closeMobileDrawer,
}: {
  closeMobileDrawer?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on route change (when passed from parent)
  useEffect(() => {
    if (closeMobileDrawer) closeMobileDrawer();
  }, [navigate, closeMobileDrawer]);

  const handleCollapseToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
    if (closeMobileDrawer) closeMobileDrawer();
  }, [navigate, closeMobileDrawer]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeMobileDrawer) closeMobileDrawer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeMobileDrawer]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  // Desktop sidebar width: 240px expanded, 64px collapsed
  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`flex-shrink-0 transition-all duration-300 z-20 flex flex-col border-r border-[var(--color-border)]
        bg-[var(--color-surface)] text-[var(--color-text)]
        ${sidebarWidth}
        hidden lg:flex`}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between h-14 px-3 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight whitespace-nowrap shrink-0">
            PHOTO<span className="text-[var(--color-accent)]">STUDIO</span> AI
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCollapseToggle}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            className="p-2 rounded hover:bg-[var(--color-border)]/50 transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 shrink-0"
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <ChevronLeft className={`w-4 h-4 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded hover:bg-[var(--color-border)]/50 transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 shrink-0"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              type="button"
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                active
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'hover:bg-[var(--color-border)]/50 text-[var(--color-text)]'
              } focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2`}
            >
              <div className="flex items-center justify-center w-6 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              {!collapsed && (
                <span className={`${active ? 'font-semibold' : 'font-normal'} whitespace-nowrap shrink-0`}>
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
            <div className="text-xs text-[var(--color-muted)] mb-2 whitespace-nowrap shrink-0">PHOTO STUDIO AI</div>
            <div className="text-xs text-[var(--color-muted)] whitespace-nowrap shrink-0">Zero-spend · Remote AI</div>
          </>
        )}
        {collapsed && (
          <div className="text-[var(--color-accent)] text-xs whitespace-nowrap shrink-0" title="PHOTO STUDIO AI — Zero-spend · Remote AI">
            PHOTO STUDIO AI
          </div>
        )}
      </div>
    </aside>
  );
}
