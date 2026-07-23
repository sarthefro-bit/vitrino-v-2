import { createClient } from '@supabase/supabase-js';
import { addLog } from './logger';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

// Support both publishable key and anon key
const SUPABASE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

export const hasSupabaseCredentials = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (!hasSupabaseCredentials) {
  addLog('warn', 'database', 'اعتبارنامه Supabase یافت نشد. برنامه در حالت ذخیره‌سازی محلی (آفلاین) اجرا می‌شود.');
} else {
  addLog('info', 'database', 'تنظیمات Supabase شناسایی شد.', { url: SUPABASE_URL });
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // needed for the Google OAuth redirect back to /auth
    },
  }
);
