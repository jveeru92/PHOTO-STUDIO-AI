/// <reference types="vite/client" />

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path: string, opts: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...opts, headers });
  let body: any = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  if (!res.ok) {
    const msg = body && body.error ? body.error : body && body.message ? body.message : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return body;
}

export { ApiError };

export const api = {
  // Health
  health: () => request('/health'),

  // Quota / provider status
  quota: () => request('/quota'),

  // Conversations
  conversations: () => request('/conversations'),
  conversation: (id: string) => request(`/conversations?id=${id}`),
  createConversation: (title: string) =>
    request('/conversations', { method: 'POST', body: JSON.stringify({ action: 'create', title }) }),
  sendMessage: (payload: {
    conversationId?: string;
    message: string;
    attachments?: Attachment[];
    model?: string;
  }) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteConversation: (id: string) =>
    request('/conversations', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
  renameConversation: (id: string, title: string) =>
    request('/conversations', { method: 'POST', body: JSON.stringify({ action: 'rename', id, title }) }),

  // Image generation / editing
  imageGenerate: (payload: { prompt: string; conversationId?: string; aspectRatio?: string }) =>
    request('/image-generate', { method: 'POST', body: JSON.stringify(payload) }),
  imageEdit: (payload: {
    imageUrl: string;
    prompt: string;
    conversationId?: string;
    versionId?: string;
  }) =>
    request('/image-edit', { method: 'POST', body: JSON.stringify(payload) }),

  // Segmentation / background
  segment: (payload: {
    imageUrl: string;
    operation: 'remove' | 'replace';
    color?: string;
    feather?: number;
  }) =>
    request('/segment', { method: 'POST', body: JSON.stringify(payload) }),

  // Upload
  upload: (file: File): Promise<{ id: string; url: string; name: string; size: number }> => {
    const form = new FormData();
    form.append('file', file);
    return request('/upload', { method: 'POST', body: form as any, headers: {} });
  },

  // Projects
  projects: () => request('/projects'),
  project: (id: string) => request(`/projects?id=${id}`),
  createProject: (payload: any) =>
    request('/projects', { method: 'POST', body: JSON.stringify({ action: 'create', ...payload }) }),
  updateProject: (id: string, payload: any) =>
    request('/projects', { method: 'POST', body: JSON.stringify({ action: 'update', id, payload }) }),
  deleteProject: (id: string) =>
    request('/projects', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  kind: 'image' | 'document';
};
