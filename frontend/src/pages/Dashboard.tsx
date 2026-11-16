import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Image, FileText, Layers, Activity, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuotaBanner } from '@/components/ui/QuotaBanner';
import { useApp } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';

const quickActions: { label: string; to: string; Icon: ElementType; desc: string }[] = [
  { label: 'New Passport Photo', to: '/passport', Icon: FileText, desc: 'Automatic passport preparation + print sheet' },
  { label: 'New AI Image', to: '/editor', Icon: Image, desc: 'Text-to-image + conversational editing' },
  { label: 'Background Editor', to: '/background', Icon: Layers, desc: 'Remove or replace backgrounds' },
];

export default function Dashboard() {
  const { projects, providerQuota, usageToday, refreshQuota } = useApp();
  const [stats, setStats] = useState({ projects: 0, images: 0, aiRequests: 0 });

  useEffect(() => {
    setStats({ projects: projects.length, images: 0, aiRequests: usageToday?.imageGenerations ?? 0 });
    refreshQuota();
  }, [projects, refreshQuota, usageToday]);

  return (
    <PageWrapper pageName="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Welcome back</h1>
          <p className="text-[var(--color-muted)] mt-1">Create, edit and export photos — zero-spend AI studio.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((a) => (
            <Card key={a.to} className="hover:shadow-md transition cursor-pointer group" onClick={() => { window.location.href = a.to; }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">{a.Icon ? <a.Icon className="w-5 h-5" /> : null} {a.label}</CardTitle>
                <p className="text-xs text-[var(--color-muted)]">{a.desc}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Projects" value={stats.projects} Icon={Activity} />
          <StatCard label="AI images (today)" value={stats.aiRequests} Icon={Image} />
          <StatCard label="Provider status" value={providerQuota.length} Icon={ShieldCheck} />
          <StatCard label="Plan" value="Zero-spend" Icon={ShieldCheck} />
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <Card>
              <CardHeader className="pb-3 flex items-center justify-between">
                <CardTitle>Provider health & today's AI usage</CardTitle>
                <Button variant="ghost" size="sm" onClick={refreshQuota}>Refresh</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {providerQuota.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)]">No provider data. Configure an AI key to enable generation.</p>
                ) : (
                  providerQuota.map((p) => (
                    <div key={p.name} className="flex justify-between items-center border-b border-[var(--color-border)]/50 pb-2 last:border-0">
                      <div>
                        <div className="text-sm text-[var(--color-text)]">{p.name}</div>
                        <div className="text-xs text-[var(--color-muted)]">{p.model} · {p.category}</div>
                      </div>
                      <QuotaBanner quota={p} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Recent projects</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)] text-center py-4">No projects yet. Create one from the editors.</p>
                ) : (
                  <div className="space-y-2">
                    {projects.slice(0, 6).map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-sm border-b border-[var(--color-border)]/50 pb-2 last:border-0">
                        <div className="truncate mr-2">{p.name}</div>
                        <Badge variant="outline">{p.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link to="/projects" className="text-xs text-[var(--color-accent)] hover:underline">View all projects</Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatCard({ label, value, Icon }: { label: string; value: number | string; Icon: ElementType }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[var(--color-neutral-100)] text-[var(--color-muted)]">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{value}</div>
            <div className="text-xs text-[var(--color-muted)]">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
