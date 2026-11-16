import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useApp } from '@/context/AppContext';
import { Sun, Moon, ShieldAlert } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { providerQuota } = useApp();
  const zeroSpend = true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
        <p className="text-[var(--color-muted)] mt-1">Appearance, privacy and zero-spend controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <p className="text-[var(--color-muted)] text-sm">Choose the studio theme. Preference is saved in your browser.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">Theme</div>
              <div className="text-xs text-[var(--color-muted)]">Light or dark studio theme</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" /> Dark
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="hidden sm:block">
                Toggle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zero-spend policy</CardTitle>
          <p className="text-[var(--color-muted)] text-sm">No paid AI. No automatic billing. No paid fallback.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">ZERO_SPEND_MODE</div>
              <div className="text-xs text-[var(--color-muted)]">Enforced on the backend. Paid providers are never used.</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={zeroSpend ? 'default' : 'outline'}>
                {zeroSpend ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </div>
          <div className="text-[var(--color-muted)] text-sm">
            AI provider keys are optional. Without them, manual editing, Passport Studio and Background Editor work fully offline.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider status</CardTitle>
          <p className="text-[var(--color-muted)] text-sm">Remote AI providers. Keys are set in Netlify environment variables, never in code.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {providerQuota.length === 0 ? (
            <div className="text-xs text-[var(--color-muted)]">No providers reporting. Add API keys in Netlify → Environment variables.</div>
          ) : (
            providerQuota.map((p) => (
              <div key={p.name} className="text-sm border-b border-[var(--color-border)]/50 pb-2 last:border-0 flex justify-between items-start gap-3">
                <div>
                  <div className="text-[var(--color-text)]">{p.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">{p.model}</div>
                </div>
                <Badge variant={p.available ? 'default' : 'outline'}>{p.available ? 'Available' : 'Unavailable'}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-text)]">Remote AI consent</div>
          </div>
          <div className="text-[var(--color-muted)] text-xs space-y-1">
            <p>Before an uploaded photo is sent to a remote AI provider, you will be told which provider will receive it and asked to consent.</p>
            <p>Private photos are never used for training without your informed consent. Manual processing never leaves your browser.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
