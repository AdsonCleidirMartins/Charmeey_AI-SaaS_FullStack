/**
 * Client-side mock auth used only when the FastAPI backend is unreachable
 * (e.g. the frontend is deployed on its own as a portfolio demo).
 *
 * Accounts live in localStorage and passwords are stored as salted SHA-256
 * digests. This is a demo convenience, NOT a security boundary — real
 * authentication is handled by services/ai (PBKDF2 + server-side sessions).
 */
import type { User } from './api';

const USERS_KEY = 'charmeeyai_mock_users';
const SESSIONS_KEY = 'charmeeyai_mock_sessions';
export const MOCK_TOKEN_PREFIX = 'mock_';

interface StoredUser {
  id: number;
  name: string;
  email: string;
  salt: string;
  hash: string;
}

const DEMO_USER: User = { id: 1, name: 'Demo User', email: 'demo@charmeeyai.app', is_demo: true };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(password: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toPublic(u: StoredUser): User {
  return { id: u.id, name: u.name, email: u.email, is_demo: false };
}

function createSession(user: User): string {
  const token = `${MOCK_TOKEN_PREFIX}${randomHex(24)}`;
  const sessions = read<Record<string, User>>(SESSIONS_KEY, {});
  sessions[token] = user;
  write(SESSIONS_KEY, sessions);
  return token;
}

export function isMockToken(token: string | null): boolean {
  return !!token && token.startsWith(MOCK_TOKEN_PREFIX);
}

export async function mockSignUp(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const users = read<Record<string, StoredUser>>(USERS_KEY, {});
  const key = email.trim().toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');
  const salt = randomHex(16);
  const stored: StoredUser = {
    id: 1000 + Object.keys(users).length + 1,
    name: name.trim(),
    email: key,
    salt,
    hash: await digest(password, salt),
  };
  users[key] = stored;
  write(USERS_KEY, users);
  const user = toPublic(stored);
  return { token: createSession(user), user };
}

export async function mockSignIn(email: string, password: string): Promise<{ token: string; user: User }> {
  const users = read<Record<string, StoredUser>>(USERS_KEY, {});
  const stored = users[email.trim().toLowerCase()];
  if (!stored || (await digest(password, stored.salt)) !== stored.hash) {
    throw new Error('Invalid email or password.');
  }
  const user = toPublic(stored);
  return { token: createSession(user), user };
}

export function mockDemo(): { token: string; user: User } {
  return { token: createSession(DEMO_USER), user: DEMO_USER };
}

export function mockMe(token: string): User | null {
  return read<Record<string, User>>(SESSIONS_KEY, {})[token] ?? null;
}

export function mockSignOut(token: string): void {
  const sessions = read<Record<string, User>>(SESSIONS_KEY, {});
  delete sessions[token];
  write(SESSIONS_KEY, sessions);
}
