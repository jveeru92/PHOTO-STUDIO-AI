import { useNavigate, useMatch } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Folder,
  Settings,
  Sun,
  Moon,
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

export default function Sidebar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 h-[100dvh] w-20 lg:w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] text-[var(--color-text)] transition-colors duration-300 flex flex-col z-20">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <span className="font-bold text-xl tracking-tight">PHOTO<span className="text-[var(--color-accent)]">STUDIO</span> AI</span>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded hover:bg-[var(--color-border)]/50 transition"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const match = useMatch(item.path);
          const Icon = iconMap[item.icon];
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                match
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'hover:bg-[var(--color-border)]/50 text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden md:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 lg:px-6 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="text-xs text-[var(--color-muted)] mb-3">PHOTO STUDIO AI</div>
        <div className="text-xs text-[var(--color-muted)]">Zero-spend · Remote AI</div>
      </div>
    </aside>
  );
}
