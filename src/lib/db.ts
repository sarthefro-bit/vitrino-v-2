import { supabase, hasSupabaseCredentials } from './supabaseClient';
import { addLog } from './logger';

// ============================================
// DATA MODELS
// ============================================

export interface NailTech {
  id: string;
  slug: string;
  username: string;
  email: string;
  name: string;
  city: string;
  address?: string;
  instagram: string;
  whatsapp?: string;
  telegram?: string;
  avatar_url: string;
  mobile?: string;
  created_at: string;
  updated_at: string;
}

export interface Design {
  id: string;
  tech_id: string;
  title: string;
  image_url: string;
  tags: string[];
  price: number;
  duration: number; // in minutes
  created_at: string;
  updated_at: string;
}

// Global runtime diagnostic flags
export let lastCloudError: string | null = null;
export let isCloudFallbackActive = false;

// Reset the flags once a cloud operation succeeds so the warning banner clears
function markCloudHealthy(): void {
  lastCloudError = null;
  isCloudFallbackActive = false;
}

// ============================================
// SESSION MANAGERS
// ============================================

const SESSION_KEY = 'vitrino_active_user_session';

export function getCurrentUserSession(): { id: string; username: string; slug: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUserSession(tech: NailTech): void {
  try {
    const sessionData = {
      id: tech.id,
      username: tech.username || tech.slug,
      slug: tech.slug,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    addLog('info', 'auth', `ورود موفق کاربر: ${tech.name} (${tech.username || tech.slug})`);
  } catch (e) {
    console.error('Failed to set session:', e);
  }
}

export function logoutUserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    addLog('info', 'auth', 'خروج کاربر از سیستم');
  } catch (e) {
    console.error('Failed to logout session:', e);
  }
}

// ============================================
// LOCAL STORAGE PERSISTENCE UTILITIES
// ============================================

const TECHS_KEY = 'vitrino_nail_techs';
const DESIGNS_KEY = 'vitrino_designs';

export function getLocalTechs(): NailTech[] {
  try {
    const data = localStorage.getItem(TECHS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalTechs(techs: NailTech[]): void {
  try {
    localStorage.setItem(TECHS_KEY, JSON.stringify(techs));
  } catch (err) {
    console.error('Error saving local techs:', err);
  }
}

export function getLocalDesigns(): Design[] {
  try {
    const data = localStorage.getItem(DESIGNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalDesigns(designs: Design[]): void {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  } catch (err) {
    console.error('Error saving local designs:', err);
  }
}

// ============================================
// LEGACY DEMO DATA CLEANUP & SEEDING
// ============================================

export const INITIAL_DEMO_DESIGNS: Design[] = [];

export function cleanDemoDataFromLocalStorage(): void {
  try {
    const techs = getLocalTechs().filter(t => !t.id.startsWith('5a1a100'));
    saveLocalTechs(techs);

    const designs = getLocalDesigns().filter(d => !d.id.startsWith('5d1d100'));
    saveLocalDesigns(designs);
  } catch (e) {
    console.error('Failed to clean demo data from localStorage:', e);
  }
}

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(TECHS_KEY);
    localStorage.removeItem(DESIGNS_KEY);
    localStorage.removeItem(SESSION_KEY);
    addLog('info', 'database', 'حافظه محلی کاملاً پاکسازی شد.');
  } catch (e) {
    console.error('Failed to clear local storage:', e);
  }
}

cleanDemoDataFromLocalStorage();

// ============================================
// NAIL TECH DB OPERATIONS
// ============================================

export async function getAllNailTechs(): Promise<NailTech[]> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*');

      if (!error && data) {
        markCloudHealthy();
        addLog('info', 'database', `دریافت ${data.length} ناخن‌کار از Supabase`);
        return [...data].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
      } else if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('error', 'database', 'خطای Supabase در دریافت لیست ناخن‌کاران. انتقال به ذخیره‌سازی محلی.', error);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
      addLog('error', 'database', 'خطای غیرمنتظره در اتصال به Supabase', err);
    }
  } else {
    isCloudFallbackActive = true;
  }

  const localTechs = getLocalTechs().filter(t => !t.id.startsWith('5a1a100'));
  addLog('info', 'database', 'دریافت لیست ناخن‌کاران از ذخیره‌سازی محلی');
  return localTechs.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

export async function getNailTechByEmail(email: string): Promise<NailTech | null> {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) return null;

  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .eq('email', cleaned)
        .maybeSingle();

      if (!error && data) {
        markCloudHealthy();
        addLog('info', 'database', `ناخن‌کار در Supabase یافت شد: ${data.name}`);
        return data;
      }
      if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('warn', 'database', `خطا در جستجوی کاربر در Supabase: ${error.message}`);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
    }
  }

  // Fallback to local storage
  const techs = getLocalTechs();
  return techs.find(t => t.email?.toLowerCase() === cleaned) || null;
}

export async function getNailTechBySlug(slug: string): Promise<NailTech | null> {
  const cleanedSlug = slug.trim().toLowerCase();

  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .eq('slug', cleanedSlug)
        .maybeSingle();

      if (!error && data) {
        markCloudHealthy();
        return data;
      }
      if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('warn', 'database', `دریافت پروفایل ${slug} از Supabase ناموفق بود: ${error.message}`);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
    }
  }

  const techs = getLocalTechs().filter(t => !t.id.startsWith('5a1a100'));
  const found = techs.find(t => t.slug.toLowerCase() === cleanedSlug || t.username?.toLowerCase() === cleanedSlug);
  if (found) return found;

  if ((slug === 'profile' || slug === ':slug') && techs.length > 0) {
    return techs[0];
  }
  return null;
}

export async function saveNailTech(data: {
  id?: string;
  slug: string;
  username?: string;
  email: string;
  name: string;
  city: string;
  address?: string;
  instagram: string;
  whatsapp?: string;
  telegram?: string;
  avatar_url?: string;
}): Promise<NailTech | null> {
  const now = new Date().toISOString();
  const techId = data.id || crypto.randomUUID();
  const username = data.username || data.slug || techId.slice(0, 8);

  // Preserve original creation date when updating an existing profile
  const existingLocal = getLocalTechs().find(t => t.id === techId);

  // No `mobile` here: the phone-number flow is gone and the cloud table has no such column
  const payload: NailTech = {
    id: techId,
    slug: data.slug || username,
    username,
    email: (data.email || '').trim().toLowerCase(), // may be empty for pre-refactor local profiles
    name: data.name,
    city: data.city,
    address: data.address || '',
    instagram: data.instagram,
    whatsapp: data.whatsapp || '',
    telegram: data.telegram || '',
    avatar_url: data.avatar_url || '',
    created_at: existingLocal?.created_at || now,
    updated_at: now,
  };

  let savedInCloud = false;

  if (hasSupabaseCredentials) {
    try {
      const { data: result, error } = await supabase
        .from('nail_techs')
        .upsert(payload)
        .select()
        .single();

      if (!error && result) {
        savedInCloud = true;
        markCloudHealthy();
        addLog('success', 'database', `پروفایل ناخن‌کار با موفقیت در Supabase ذخیره شد: ${payload.name}`);
      } else if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('error', 'database', `خطای ذخیره‌سازی ناخن‌کار در Supabase: ${error.message} (کد: ${error.code})`, error);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
      addLog('error', 'database', 'استثنا در ذخیره‌سازی ناخن‌کار در Supabase', err);
    }
  } else {
    isCloudFallbackActive = true;
  }

  // Always sync to local storage to ensure client continuity
  const techs = getLocalTechs();
  const index = techs.findIndex(t => t.id === techId || t.slug === payload.slug);
  if (index !== -1) {
    techs[index] = { ...techs[index], ...payload, updated_at: now };
  } else {
    techs.unshift(payload);
  }
  saveLocalTechs(techs);

  if (!savedInCloud) {
    addLog('warn', 'database', `پروفایل ${payload.name} در ذخیره‌سازی محلی مرجع ذخیره شد (آفلاین).`);
  }

  return payload;
}

// ============================================
// DESIGNS DB OPERATIONS
// ============================================

export async function getDesigns(techId: string): Promise<Design[]> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('tech_id', techId);

      if (!error && data) {
        markCloudHealthy();
        return [...data].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
      } else if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('warn', 'database', `خطا در دریافت نمونه‌کارهای Supabase برای ${techId}: ${error.message}`);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
    }
  }

  const localDesigns = getLocalDesigns().filter(d => !d.id.startsWith('5d1d100'));
  return localDesigns
    .filter(d => d.tech_id === techId)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export async function addDesign(data: Omit<Design, 'id' | 'created_at' | 'updated_at'>): Promise<Design | null> {
  const now = new Date().toISOString();
  const newDesign: Design = {
    id: crypto.randomUUID(),
    tech_id: data.tech_id,
    title: data.title,
    image_url: data.image_url,
    tags: data.tags || [],
    price: data.price || 0,
    duration: data.duration || 60,
    created_at: now,
    updated_at: now,
  };

  let savedInCloud = false;

  if (hasSupabaseCredentials) {
    try {
      const { data: result, error } = await supabase
        .from('designs')
        .insert(newDesign)
        .select()
        .single();

      if (!error && result) {
        savedInCloud = true;
        markCloudHealthy();
        addLog('success', 'database', `نمونه‌کار جدید با موفقیت در Supabase اضافه شد: ${newDesign.title}`);
      } else if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('error', 'database', `خطا در افزودن نمونه‌کار در Supabase: ${error.message}`, error);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
      addLog('error', 'database', 'استثنا در ثبت نمونه‌کار در Supabase', err);
    }
  } else {
    isCloudFallbackActive = true;
  }

  // Sync to local storage
  const designs = getLocalDesigns();
  designs.unshift(newDesign);
  saveLocalDesigns(designs);

  if (!savedInCloud) {
    addLog('warn', 'database', `نمونه‌کار "${newDesign.title}" در ذخیره‌سازی محلی ذخیره گردید.`);
  }

  return newDesign;
}

export async function deleteDesign(designId: string): Promise<boolean> {
  if (hasSupabaseCredentials) {
    try {
      const { error } = await supabase
        .from('designs')
        .delete()
        .eq('id', designId);

      if (!error) {
        addLog('info', 'database', `نمونه‌کار ${designId} از Supabase حذف شد.`);
      } else {
        addLog('warn', 'database', `خطا در حذف نمونه‌کار از Supabase: ${error.message}`);
      }
    } catch (err) {
      addLog('warn', 'database', 'استثنا در حذف نمونه‌کار از Supabase', err);
    }
  }

  const designs = getLocalDesigns();
  const filtered = designs.filter(d => d.id !== designId);
  saveLocalDesigns(filtered);
  return true;
}

export async function updateDesign(updatedDesign: Design): Promise<Design | null> {
  const now = new Date().toISOString();
  const payload = { ...updatedDesign, updated_at: now };

  if (hasSupabaseCredentials) {
    try {
      const { data: result, error } = await supabase
        .from('designs')
        .upsert(payload)
        .select()
        .single();

      if (!error && result) {
        markCloudHealthy();
        addLog('success', 'database', `نمونه‌کار با موفقیت به روزرسانی شد: ${payload.title}`);
      }
    } catch (err) {
      console.error('Error updating design in Supabase:', err);
    }
  }

  const designs = getLocalDesigns();
  const index = designs.findIndex(d => d.id === payload.id);
  if (index !== -1) {
    designs[index] = payload;
  } else {
    designs.unshift(payload);
  }
  saveLocalDesigns(designs);
  return payload;
}
