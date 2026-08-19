import type { AppState } from './types';

const API_BASE = '/api';
const TOKEN_KEY = 'rb_session_token';

export class AuthError extends Error {
  constructor(message = 'Faça login para continuar.') {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthUser {
  id: string;
  username: string;
  token: string;
}

type AuthResponse = { id: string; username?: string; email?: string; token: string };

let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY);
    return memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Preview iframes can deny storage; memory still holds the session.
  }
}

async function apiFetch(path: string, init?: RequestInit, tokenOverride?: string): Promise<Response> {
  const token = tokenOverride || getAuthToken();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (response.status === 401) {
    throw new AuthError();
  }
  return response;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function saveSession(response: Response): Promise<AuthUser> {
  const body = (await response.json()) as AuthResponse;
  if (!body?.token || !body.id) {
    throw new Error('Resposta de login inválida.');
  }
  setAuthToken(body.token);
  const username = body.username || body.email;
  if (!username) {
    throw new Error('Resposta de login inválida.');
  }
  return { id: body.id, username, token: body.token };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const response = await apiFetch('/auth/me', undefined, token);
    if (!response.ok) return null;
    const user = (await response.json()) as { id: string; username?: string; email?: string };
    const username = user.username || user.email;
    if (!username) return null;
    return { id: user.id, username, token };
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Não foi possível entrar.'));
  return saveSession(response);
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Não foi possível criar a conta.'));
  return saveSession(response);
}

export async function logout(): Promise<void> {
  const token = getAuthToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  } finally {
    setAuthToken(null);
  }
}

export async function deleteAccount(confirmation: string, token?: string): Promise<void> {
  const response = await apiFetch('/auth/account/delete', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  }, token);
  if (!response.ok) throw new Error(await readError(response, 'Não foi possível excluir a conta.'));
  setAuthToken(null);
}

export async function fetchAppState(token?: string): Promise<AppState> {
  const response = await apiFetch('/state', undefined, token);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as AppState;
}

let inFlight: Promise<void> | null = null;
let queued: AppState | null = null;

export async function persistAppState(state: AppState, token?: string): Promise<void> {
  queued = state;
  if (inFlight) return inFlight;

  inFlight = flushQueue(token).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function flushQueue(token?: string): Promise<void> {
  while (queued) {
    const next = queued;
    queued = null;
    const response = await apiFetch('/state', {
      method: 'PUT',
      body: JSON.stringify(next),
    }, token);
    if (!response.ok) {
      queued = queued ?? next;
      throw new Error(`HTTP ${response.status}`);
    }
  }
}
