import { supabase, hasSupabaseCredentials } from './supabaseClient';
import { addLog } from './logger';

// ============================================
// EMAIL OTP + GOOGLE AUTHENTICATION
// Supabase Auth when credentials exist,
// otherwise a local demo fallback (like db.ts).
// ============================================

const LOCAL_OTP_KEY = 'vitrino_local_otp';
const AUTH_EMAIL_KEY = 'vitrino_auth_email';

const OTP_TTL_MS = 5 * 60 * 1000; // local demo codes expire after 5 minutes

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export interface SendOtpResult {
  ok: boolean;
  /** Only set in local demo mode so the UI can show the code to the user. */
  demoCode?: string;
  error?: string;
}

export async function sendEmailOtp(email: string): Promise<SendOtpResult> {
  const cleaned = email.trim().toLowerCase();

  if (hasSupabaseCredentials) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: {
          shouldCreateUser: true,
          // If the user clicks the email link instead of typing the code,
          // land them on /auth so the app can route them properly.
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        addLog('error', 'auth', `خطا در ارسال کد یکبارمصرف به ${cleaned}: ${error.message}`, error);
        return { ok: false, error: 'ارسال کد با خطا مواجه شد. لطفاً دوباره تلاش کنید.' };
      }

      addLog('info', 'auth', `کد یکبارمصرف به ایمیل ${cleaned} ارسال شد.`);
      return { ok: true };
    } catch (err) {
      addLog('error', 'auth', 'استثنا در ارسال کد یکبارمصرف', err);
      return { ok: false, error: 'ارسال کد با خطا مواجه شد. لطفاً دوباره تلاش کنید.' };
    }
  }

  // Local demo mode: generate a code and surface it in the UI
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    localStorage.setItem(
      LOCAL_OTP_KEY,
      JSON.stringify({ email: cleaned, code, expiresAt: Date.now() + OTP_TTL_MS })
    );
  } catch {
    return { ok: false, error: 'خطا در ذخیره‌سازی کد.' };
  }

  addLog('warn', 'auth', `حالت دمو: کد یکبارمصرف ${cleaned} => ${code}`);
  return { ok: true, demoCode: code };
}

export async function verifyEmailOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const cleaned = email.trim().toLowerCase();
  const token = code.trim();

  if (!token) return { ok: false, error: 'لطفاً کد ارسال شده را وارد کنید.' };

  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleaned,
        token,
        type: 'email',
      });

      if (error || !data.session) {
        addLog('warn', 'auth', `کد نامعتبر برای ${cleaned}: ${error?.message || 'no session'}`);
        return { ok: false, error: 'کد وارد شده نادرست یا منقضی شده است.' };
      }

      localStorage.setItem(AUTH_EMAIL_KEY, cleaned);
      addLog('success', 'auth', `احراز هویت ایمیل ${cleaned} با موفقیت انجام شد.`);
      return { ok: true };
    } catch (err) {
      addLog('error', 'auth', 'استثنا در بررسی کد یکبارمصرف', err);
      return { ok: false, error: 'خطا در بررسی کد. لطفاً دوباره تلاش کنید.' };
    }
  }

  // Local demo verification
  try {
    const raw = localStorage.getItem(LOCAL_OTP_KEY);
    const stored = raw ? (JSON.parse(raw) as { email: string; code: string; expiresAt: number }) : null;

    if (!stored || stored.email !== cleaned) {
      return { ok: false, error: 'کدی برای این ایمیل ارسال نشده است.' };
    }
    if (Date.now() > stored.expiresAt) {
      return { ok: false, error: 'کد منقضی شده است. کد جدید دریافت کنید.' };
    }
    if (stored.code !== token) {
      return { ok: false, error: 'کد وارد شده نادرست است.' };
    }

    localStorage.removeItem(LOCAL_OTP_KEY);
    localStorage.setItem(AUTH_EMAIL_KEY, cleaned);
    addLog('success', 'auth', `احراز هویت محلی ایمیل ${cleaned} انجام شد.`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'خطا در بررسی کد.' };
  }
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseCredentials) {
    return {
      ok: false,
      error: 'ورود با گوگل نیاز به اتصال Supabase دارد. در حالت دمو از کد ایمیل استفاده کنید.',
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` },
    });

    if (error) {
      addLog('error', 'auth', `خطا در ورود با گوگل: ${error.message}`, error);
      return { ok: false, error: 'ورود با گوگل با خطا مواجه شد.' };
    }
    return { ok: true }; // browser is being redirected
  } catch (err) {
    addLog('error', 'auth', 'استثنا در ورود با گوگل', err);
    return { ok: false, error: 'ورود با گوگل با خطا مواجه شد.' };
  }
}

/** Email of the currently authenticated user (Supabase session or local demo), or null. */
export async function getAuthedEmail(): Promise<string | null> {
  if (hasSupabaseCredentials) {
    try {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email;
      if (email) {
        const cleaned = email.toLowerCase();
        localStorage.setItem(AUTH_EMAIL_KEY, cleaned);
        return cleaned;
      }
    } catch {
      // fall through to local
    }
  }

  try {
    return localStorage.getItem(AUTH_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function signOutAuth(): Promise<void> {
  if (hasSupabaseCredentials) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  try {
    localStorage.removeItem(AUTH_EMAIL_KEY);
  } catch {
    // ignore
  }
  addLog('info', 'auth', 'خروج از حساب کاربری انجام شد.');
}
