import { useEffect, useState } from 'react';
import { Folder, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api.projects();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      // Fall back to local storage
      const local = await storage.listProjects();
      setProjects(local);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.deleteProject(id);
    } catch {
      await storage.deleteProject(id);
    }
    load();
  }

  async function handleDuplicate(id: string) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    try {
      await api.createProject({ ...p, name: `${p.name} (copy)`, id: undefined });
    } catch {
      await storage.saveProject({ ...p, id: Date.now().toString(), name: `${p.name} (copy)` });
    }
    load();
  }

  if (loading) return (
    <div className="py-10 text-center text-[var(--color-muted)]">Loading projects…</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Recent Projects</h1>
          <p className="text-[var(--color-muted)] mt-1">Saved projects, versions and export history.</p>
        </div>
        <Button onClick={() => window.location.href = '/editor'}>New project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <Folder className="w-16 h-16 mx-auto text-[var(--color-muted)] mb-3" />
          <p className="text-[var(--color-muted)]">No projects yet. Start editing to create one.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Card key={p.id} className="cursor-pointer group hover:shadow-sm transition" onClick={() => window.location.href = `/editor?project=${p.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start">
                  <span className="font-medium text-[var(--color-text)]">{p.name || 'Untitled'}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicate(p.id); }} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)]">
                    <Plus className="w-4 h-4" />
                  </button>
                </CardTitle>
                <p className="text-xs text-[var(--color-muted)]">{p.type} · {new Date(p.updatedAt).toLocaleDateString()}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                  <span>{p.versions?.length ?? 0} version(s)</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
