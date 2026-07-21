import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;
// Supabase now issues "publishable" keys (sb_publishable_...); legacy anon JWT keys still work
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

if (!isConfigured) {
  console.warn('⚠️ Supabase credentials are missing. Falling back to local storage offline mode.');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export const hasSupabaseCredentials = isConfigured;

/**
 * Every browser gets its own anonymous Supabase auth session (persisted in
 * localStorage by supabase-js, same as the rest of this app's local-first
 * model). This gives Row Level Security a real auth.uid() to check against,
 * so writes can be scoped to "only the owner of this row" instead of the
 * previous "anyone with the public anon key can edit/delete anything".
 *
 * Requires "Anonymous Sign-Ins" to be enabled in Supabase Dashboard ->
 * Authentication -> Providers.
 */
let anonAuthPromise: Promise<void> | null = null;

export function ensureAnonymousSession(): Promise<void> {
  if (!isConfigured) return Promise.resolve();
  if (!anonAuthPromise) {
    anonAuthPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) console.warn('Anonymous auth failed:', error.message);
        }
      } catch (err) {
        console.warn('Anonymous auth failed:', err);
      }
    })();
  }
  return anonAuthPromise;
}

