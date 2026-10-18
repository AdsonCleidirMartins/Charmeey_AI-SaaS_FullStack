const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');
export const API_URL = apiBase || '';
const wsProto = (apiBase ?? location.protocol).startsWith('https') ? 'wss' : 'ws';
const wsHost = apiBase ? apiBase.replace(/^https?:\/\//, '') : location.host;
export const API_WS_URL = `${wsProto}://${wsHost}`;

const TOKEN_KEY = 'charmeeyai_token';

export interface User {
  id: number;
  name: string;
  email: string;
  is_demo: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
  } catch {
    throw new ApiError('Cannot reach the CharmeeyAI service.', 0, true);
  }

  const raw = await res.text().catch(() => '');
  let data: { detail?: unknown; message?: unknown } | null = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    // Gateway errors, or an empty 500 from the dev proxy, mean the backend is down
    const offline = res.status >= 502 || (res.status === 500 && !raw.trim());
    const detail = data?.detail || data?.message || `Request failed (${res.status})`;
    const message = typeof detail === 'string' ? detail : formatValidationDetail(detail);
    throw new ApiError(message, res.status, offline);
  }

  return data as T;
}

/** Error thrown by apiRequest. `offline` is true when the backend could not be reached. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public offline: boolean) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isOfflineError(err: unknown): boolean {
  return err instanceof ApiError && err.offline;
}

// FastAPI 422 responses carry a list of { loc, msg } objects
function formatValidationDetail(detail: unknown): string {
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d)))
      .join(' ');
  }
  return JSON.stringify(detail);
}

export async function signUp(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  return apiRequest('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signIn(email: string, password: string): Promise<{ token: string; user: User }> {
  return apiRequest('/api/v1/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signOutRequest(token: string): Promise<void> {
  await apiRequest('/api/v1/auth/signout', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getMe(token: string): Promise<{ authenticated: boolean; user?: User }> {
  return apiRequest('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getDemo(): Promise<{ token: string; user: User }> {
  return apiRequest('/api/v1/auth/demo', { method: 'POST' });
}

export interface GenerateOptions {
  system?: string;
  attachment?: import('./attachments').Attachment;
}

export async function generateChat(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{ response: string; model: string }> {
  const payload: Record<string, unknown> = { prompt };

  if (options.system) {
    payload.system = options.system;
  }
  if (options.attachment) {
    if (options.attachment.kind === 'image') {
      payload.image_data = options.attachment.data;
      payload.image_mime = options.attachment.mime;
    } else {
      payload.file_data = options.attachment.data;
      payload.file_name = options.attachment.name;
    }
  }

  try {
    return await apiRequest<{ response: string; model: string }>('/api/v1/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const { mockGenerate } = await import('./mockAi');
    return mockGenerate(prompt);
  }
}

export interface RoomMessage {
  id: number;
  user_id?: number;
  name: string;
  content: string;
  created_at: string | null;
  image?: string;
}

export type PresenceUser = { id: number; name: string };

export interface RoomState {
  messages: RoomMessage[];
  online: number;
  users: PresenceUser[];
}

export async function getRoomMessages(limit = 50): Promise<RoomState> {
  return apiRequest(`/api/v1/room/messages?limit=${limit}`);
}

export async function postRoomMessage(content: string): Promise<RoomMessage> {
  return apiRequest('/api/v1/room/messages', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function deleteRoomMessages(ids: number[]): Promise<{ ok: boolean; deleted: number[] }> {
  return apiRequest('/api/v1/room/messages', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteAllRoomMessages(): Promise<{ ok: boolean; deleted: number[] }> {
  return apiRequest('/api/v1/room/messages/all', { method: 'DELETE' });
}

export async function deleteDmMessages(ids: number[]): Promise<{ ok: boolean; deleted: number[] }> {
  return apiRequest('/api/v1/dm/messages', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteAllDmMessages(peerId: number): Promise<{ ok: boolean; deleted: number[] }> {
  return apiRequest(`/api/v1/dm/messages/all?peer_id=${peerId}`, { method: 'DELETE' });
}

export async function getUsers(q = ''): Promise<{ users: User[] }> {
  return apiRequest(`/api/v1/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export interface DirectMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  name: string;
  content: string;
  created_at: string | null;
}

export interface Conversation {
  peer_id: number;
  peer_name: string;
  last_message: string;
  last_at: string | null;
}

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  return apiRequest('/api/v1/dm/conversations');
}

export async function getDmMessages(peerId: number): Promise<{ messages: DirectMessage[] }> {
  return apiRequest(`/api/v1/dm/${peerId}/messages`);
}

export async function sendDm(recipientId: number, content: string): Promise<DirectMessage> {
  return apiRequest('/api/v1/dm/send', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: recipientId, content }),
  });
}

export interface NotificationItem {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  sender_id: number | null;
  is_read: boolean;
  created_at: string | null;
}

export async function getNotifications(): Promise<{ notifications: NotificationItem[] }> {
  return apiRequest('/api/v1/notifications');
}

export async function deleteNotification(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/v1/notifications/${id}`, { method: 'DELETE' });
}