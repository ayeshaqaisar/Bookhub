import { getBackendClient, isBackendConfigured } from '@/lib/backendClient';

export type RegisterArgs = { email: string; password: string; data?: Record<string, any> };
export type LoginArgs = { email: string; password: string };

export async function registerUser({ email, password, data }: RegisterArgs) {
  if (!isBackendConfigured()) {
    throw new Error('Backend is not configured.');
  }
  const backend = getBackendClient();
  const { data: signUpData, error } = await backend.auth.signUp({
    email,
    password,
    options: { data },
  });
  if (error) throw error;
  return signUpData;
}

export async function loginWithEmail({ email, password }: LoginArgs) {
  if (!isBackendConfigured()) {
    throw new Error('Backend is not configured.');
  }
  const backend = getBackendClient();
  const { data: signInData, error } = await backend.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return signInData;
}

export async function signOut() {
  if (!isBackendConfigured()) {
    throw new Error('Backend is not configured.');
  }
  const backend = getBackendClient();
  const { error } = await backend.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!isBackendConfigured()) {
    throw new Error('Backend is not configured.');
  }
  const backend = getBackendClient();
  const { data } = await backend.auth.getUser();
  return data.user ?? null;
}
