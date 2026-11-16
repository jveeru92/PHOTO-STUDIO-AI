import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
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

export default function App() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="min-h-[100dvh]">
            <Sidebar
              isMobileOpen={isMobileOpen}
              closeMobileDrawer={() => setIsMobileOpen(false)}
            />
            <div className="flex-1 flex flex-col min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
              <Topbar openMobileDrawer={() => setIsMobileOpen(true)} />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/passport" element={<PassportStudio />} />
                  <Route path="/editor" element={<NormalPhotoEditor />} />
                  <Route path="/background" element={<BackgroundEditor />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
