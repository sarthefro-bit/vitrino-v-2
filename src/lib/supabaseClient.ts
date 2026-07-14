import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

if (!isConfigured) {
  console.warn('⚠️ Supabase credentials are missing. Falling back to local storage offline mode.');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export const hasSupabaseCredentials = isConfigured;

