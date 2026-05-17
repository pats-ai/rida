import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────
export type UserRole = 'commuter' | 'driver' | 'business';

export interface RidaUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  area?: string;
  business_name?: string;
}

// ── Send OTP to phone number ───────────────────────────────────
export async function sendOTP(phone: string): Promise<{ error: string | null }> {
  // Normalise Tanzanian numbers: 0754... → +255754...
  const normalised = normalisePhone(phone);

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalised,
  });

  return { error: error?.message ?? null };
}

// ── Verify OTP code ────────────────────────────────────────────
export async function verifyOTP(
  phone: string,
  token: string
): Promise<{ user: RidaUser | null; error: string | null }> {
  const normalised = normalisePhone(phone);

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalised,
    token,
    type: 'sms',
  });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Verification failed' };
  }

  // Fetch profile from our profiles table
  const profile = await getProfile(data.user.id);
  return { user: profile, error: null };
}

// ── Get current session ────────────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Get user profile from DB ───────────────────────────────────
export async function getProfile(userId: string): Promise<RidaUser | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data ?? null;
}

// ── Create profile after first login ──────────────────────────
export async function createProfile(profile: {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  area?: string;
  business_name?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').upsert(profile);
  return { error: error?.message ?? null };
}

// ── Sign out ───────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
}

// ── Normalise Tanzanian phone numbers ─────────────────────────
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return `+${digits}`;
  if (digits.startsWith('0')) return `+255${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('6')) return `+255${digits}`;
  return `+${digits}`;
}
