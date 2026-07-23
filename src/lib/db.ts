import { supabase, hasSupabaseCredentials } from './supabaseClient';
import { addLog } from './logger';

// ============================================
// DATA MODELS
// ============================================

export interface NailTech {
  id: string;
  slug: string;
  username: string;
  password_hash?: string;
  name: string;
  city: string;
  instagram: string;
  whatsapp?: string;
  telegram?: string;
  avatar_url: string;
  mobile: string;
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
// DEFAULT SEED DATA IF EMPTY
// ============================================

export const SEED_NAIL_TECHS: NailTech[] = [
  {
    id: 'tech-001',
    slug: 'sara_nails',
    username: 'sara_nails',
    password_hash: '123456',
    name: 'سالن تخصصی ناخن سارا',
    city: 'تهران',
    instagram: 'sara_nailart',
    whatsapp: '09127579476',
    telegram: 'sara_nailart',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop',
    mobile: '09127579476',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tech-002',
    slug: 'nikoo_dehpanah',
    username: 'nikoo_dehpanah',
    password_hash: '123456',
    name: 'خدمات تخصصی ناخن نیکو',
    city: 'اصفهان',
    instagram: 'nikoo_dehpanah',
    whatsapp: '09131112233',
    telegram: 'nikoo_dehpanah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
    mobile: '09131112233',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tech-003',
    slug: 'maryam_shakeri',
    username: 'maryam_shakeri',
    password_hash: '123456',
    name: 'سالن زیبایی و کاشت مریم',
    city: 'کرج',
    instagram: 'maryam_shakeri',
    whatsapp: '09359998877',
    telegram: 'maryam_shakeri',
    avatar_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&h=300&fit=crop',
    mobile: '09359998877',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const SEED_DESIGNS: Design[] = [
  {
    id: 'des-001',
    tech_id: 'tech-001',
    title: 'ژلیش صورتی کریستالی با دیزاین اکلیل',
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop',
    tags: ['صورتی', 'فانتزی', 'دیزاین'],
    price: 380000,
    duration: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'des-002',
    tech_id: 'tech-001',
    title: 'کاشت آکریلیک فرانسوی مات',
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&h=500&fit=crop',
    tags: ['سفید', 'فرنچ', 'ساده'],
    price: 450000,
    duration: 150,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'des-003',
    tech_id: 'tech-001',
    title: 'دیزاین تابستانی آبرنگی بنفش',
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&h=500&fit=crop',
    tags: ['بنفش', 'آمبره', 'فانتزی'],
    price: 520000,
    duration: 180,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'des-004',
    tech_id: 'tech-002',
    title: 'لمینت ناخن نود کلاسیک',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=500&fit=crop',
    tags: ['نود', 'ساده'],
    price: 290000,
    duration: 90,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'des-005',
    tech_id: 'tech-002',
    title: 'طراحی خاص مشکی متالیک',
    image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500&h=500&fit=crop',
    tags: ['مشکی', 'تم'],
    price: 490000,
    duration: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'des-006',
    tech_id: 'tech-003',
    title: 'دیزاین قرمز مجلسی براق',
    image_url: 'https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?w=500&h=500&fit=crop',
    tags: ['قرمز', 'عروسی'],
    price: 420000,
    duration: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export function ensureLocalSeedData(): void {
  const existingTechs = getLocalTechs();
  if (existingTechs.length === 0) {
    saveLocalTechs(SEED_NAIL_TECHS);
  }
  const existingDesigns = getLocalDesigns();
  if (existingDesigns.length === 0) {
    saveLocalDesigns(SEED_DESIGNS);
  }
}

// Call seed initialization on load
ensureLocalSeedData();

// ============================================
// NAIL TECH DB OPERATIONS
// ============================================

export async function getAllNailTechs(): Promise<NailTech[]> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        addLog('info', 'database', `دریافت ${data.length} ناخن‌کار از Supabase`);
        return data;
      }
      if (error) {
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

  addLog('info', 'database', 'دریافت لیست ناخن‌کاران از ذخیره‌سازی محلی');
  return getLocalTechs();
}

export async function getNailTechByPhoneOrUsername(query: string): Promise<NailTech | null> {
  const cleaned = query.trim().replace('@', '');
  if (!cleaned) return null;

  if (hasSupabaseCredentials) {
    try {
      // Try match by mobile OR username OR slug
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .or(`mobile.eq.${cleaned},username.eq.${cleaned},slug.eq.${cleaned}`)
        .maybeSingle();

      if (!error && data) {
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
  return techs.find(t => 
    t.mobile === cleaned || 
    t.username === cleaned || 
    t.slug === cleaned ||
    t.mobile?.replace(/^0/, '') === cleaned.replace(/^0/, '')
  ) || null;
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

      if (!error && data) return data;
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

  const techs = getLocalTechs();
  const found = techs.find(t => t.slug.toLowerCase() === cleanedSlug || t.username?.toLowerCase() === cleanedSlug);
  if (found) return found;

  // Fallback first item if default route
  if ((slug === 'profile' || slug === ':slug') && techs.length > 0) {
    return techs[0];
  }
  return null;
}

export async function saveNailTech(data: {
  id?: string;
  slug: string;
  username?: string;
  password_hash?: string;
  name: string;
  city: string;
  instagram: string;
  whatsapp?: string;
  telegram?: string;
  avatar_url?: string;
  mobile: string;
}): Promise<NailTech | null> {
  const now = new Date().toISOString();
  const techId = data.id || crypto.randomUUID();
  const username = data.username || data.slug || techId.slice(0, 8);

  const payload: NailTech = {
    id: techId,
    slug: data.slug || username,
    username,
    password_hash: data.password_hash || '123456',
    name: data.name,
    city: data.city,
    instagram: data.instagram,
    whatsapp: data.whatsapp || data.mobile,
    telegram: data.telegram || data.instagram,
    avatar_url: data.avatar_url || '',
    mobile: data.mobile,
    created_at: now,
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
        .eq('tech_id', techId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
      if (error) {
        lastCloudError = error.message;
        isCloudFallbackActive = true;
        addLog('warn', 'database', `خطا در دریافت نمونه‌کارهای Supabase برای ${techId}: ${error.message}`);
      }
    } catch (err) {
      lastCloudError = String(err);
      isCloudFallbackActive = true;
    }
  }

  const designs = getLocalDesigns();
  return designs
    .filter(d => d.tech_id === techId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
