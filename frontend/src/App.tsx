import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { LayoutDashboard, FileText, Image, Layers, Folder, Settings } from 'lucide-react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Dashboard from '@/pages/Dashboard';
import PassportStudio from '@/pages/PassportStudio';
import NormalPhotoEditor from '@/pages/NormalPhotoEditor';
import BackgroundEditor from '@/pages/BackgroundEditor';
import ProjectsPage from '@/pages/Projects';
import SettingsPage from '@/pages/Settings';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AppLoading, AppError } from '@/components/ui/AppStates';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/passport', label: 'Passport Studio', icon: 'FileText' },
  { path: '/editor', label: 'Normal Photo Editor', icon: 'Image' },
  { path: '/background', label: 'Background Editor', icon: 'Layers' },
  { path: '/projects', label: 'Recent Projects', icon: 'Folder' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Folder,
  Settings,
};

const ItemIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const Icon = iconMap[icon];
  return <Icon className={className} />;
};

const MobileDrawer = ({
  isMobileOpen,
  closeMobileDrawer,
}: {
  isMobileOpen: boolean;
  closeMobileDrawer: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-[100dvh] w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)]
          text-[var(--color-text)] z-50 flex flex-col lg:hidden transform transition-transform duration-300
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Mobile navigation drawer"
        role="navigation"
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <span className="font-bold text-lg tracking-tight whitespace-nowrap shrink-0">
            PHOTO<span className="text-[var(--color-accent)]">STUDIO</span> AI
          </span>
          <button
            onClick={closeMobileDrawer}
            aria-label="Close navigation"
            className="p-2 rounded hover:bg-[var(--color-border)]/50 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); closeMobileDrawer(); }}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              aria-label={item.label}
              type="button"
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition ${
                location.pathname === item.path
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'hover:bg-[var(--color-border)]/50 text-[var(--color-text)]'
              } focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2}`}
            >
              <ItemIcon icon={item.icon} className="w-5 h-5" />
              <span className={location.pathname === item.path ? 'font-semibold' : 'font-normal'}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-xs text-[var(--color-muted)] mb-2">PHOTO STUDIO AI</div>
          <div className="text-xs text-[var(--color-muted)]">Zero-spend · Remote AI</div>
        </div>
      </aside>
    </>
  );
};

export default function App() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startupError, setStartupError] = useState<Error | null>(null);

  // Mark loading complete once mounted
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const openMobileDrawer = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileDrawer = useCallback(() => setIsMobileOpen(false), []);
  const clearError = useCallback(() => setStartupError(null), []);

  const handleError = useCallback((error: Error) => {
    console.error('Photo Studio AI error:', error);
    setStartupError(error);
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider>
        <AppLoading />
      </ThemeProvider>
    );
  }

  if (startupError) {
    return (
      <ThemeProvider>
        <div className="flex min-h-[100dvh] w-full">
          <Sidebar closeMobileDrawer={closeMobileDrawer} />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar openMobileDrawer={openMobileDrawer} />
            <AppError error={startupError} retry={clearError} />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="flex min-h-[100dvh] w-full overflow-hidden">
            {/* Desktop sidebar: flex child, not fixed. Hidden on mobile (lg:hidden). */}
            <Sidebar closeMobileDrawer={closeMobileDrawer} />
            <div className="flex-1 flex flex-col min-w-0 relative">
              <MobileDrawer
                isMobileOpen={isMobileOpen}
                closeMobileDrawer={closeMobileDrawer}
              />
              <Topbar openMobileDrawer={openMobileDrawer} />
              <main className="flex-1 overflow-y-auto min-w-0 p-4 md:p-6 lg:p-8">
                <ErrorBoundary onError={handleError}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/passport" element={<PassportStudio />} />
                    <Route path="/editor" element={<NormalPhotoEditor />} />
                    <Route path="/background" element={<BackgroundEditor />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
