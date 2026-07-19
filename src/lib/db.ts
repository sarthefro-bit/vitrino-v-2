import { supabase, hasSupabaseCredentials, ensureAnonymousSession } from './supabaseClient';

// ============================================
// DATA MODELS
// ============================================

export interface NailTech {
  id: string;
  slug: string;
  name: string;
  city: string;
  instagram: string;
  avatar_url: string;
  mobile?: string;
  owner_id?: string;
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
  duration: number;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// LOCAL STORAGE UTILITIES
// ============================================

const TECHS_KEY = 'vitrino_nail_techs';
const DESIGNS_KEY = 'vitrino_designs';

function getLocalTechs(): NailTech[] {
  try {
    const data = localStorage.getItem(TECHS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalTechs(techs: NailTech[]): boolean {
  try {
    localStorage.setItem(TECHS_KEY, JSON.stringify(techs));
    return true;
  } catch (err) {
    // Most commonly QuotaExceededError — offline mode stores images as
    // Base64, and the browser's ~5-10MB localStorage limit fills up fast.
    console.error('Error saving local techs (storage may be full):', err);
    return false;
  }
}

function getLocalDesigns(): Design[] {
  try {
    const data = localStorage.getItem(DESIGNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalDesigns(designs: Design[]): boolean {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
    return true;
  } catch (err) {
    console.error('Error saving local designs (storage may be full):', err);
    return false;
  }
}

// ============================================
// SLUG UTILITIES
// ============================================

/**
 * Turn any text (including Persian salon names) into a safe URL slug.
 * Keeps Persian/Arabic letters, latin letters, and digits; strips
 * punctuation/emoji/slashes; collapses whitespace into single dashes.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a slug that's guaranteed not to collide with another tech's
 * vitrin. Without this, two salons with the same/similar name ended up
 * with the exact same slug, and one profile silently shadowed the other.
 */
export async function ensureUniqueSlug(baseInput: string, excludeId?: string): Promise<string> {
  let base = slugify(baseInput);
  if (!base) base = crypto.randomUUID().slice(0, 8);

  let candidate = base;
  let counter = 2;

  // Safety cap so a bug elsewhere can't spin this forever
  for (let i = 0; i < 50; i++) {
    const existing = await getNailTechBySlug(candidate);
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
  return `${base}-${crypto.randomUUID().slice(0, 4)}`;
}

// ============================================
// NAIL TECH - Database Operations
// ============================================

/**
 * Save or update a nail technician profile
 */
export async function saveNailTech(data: Omit<NailTech, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<NailTech | null> {
  const { id, slug, name, city, instagram, avatar_url, mobile } = data;
  const now = new Date().toISOString();

  if (hasSupabaseCredentials) {
    try {
      await ensureAnonymousSession();
      if (id) {
        // Update existing — RLS checks auth.uid() = owner_id on the row
        const { data: result, error } = await supabase
          .from('nail_techs')
          .update({
            slug,
            name,
            city,
            instagram,
            avatar_url,
            mobile,
            updated_at: now,
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && result) return result;
        if (error) console.warn('Supabase saveNailTech error, falling back to local storage:', error);
      } else {
        // Insert new
        const newId = crypto.randomUUID();
        const { data: userData } = await supabase.auth.getUser();
        const { data: result, error } = await supabase
          .from('nail_techs')
          .insert({
            id: newId,
            slug: slug || newId.slice(0, 8),
            name,
            city,
            instagram,
            avatar_url,
            mobile,
            owner_id: userData?.user?.id,
          })
          .select()
          .single();

        if (!error && result) return result;
        if (error) console.warn('Supabase saveNailTech error, falling back to local storage:', error);
      }
    } catch (err) {
      console.warn('Supabase saveNailTech failed, falling back to local storage:', err);
    }
  }

  // Local Storage Fallback
  const techs = getLocalTechs();
  if (id) {
    const index = techs.findIndex(t => t.id === id);
    if (index !== -1) {
      const updated: NailTech = {
        ...techs[index],
        slug: slug || techs[index].slug,
        name: name || techs[index].name,
        city: city || techs[index].city,
        instagram: instagram !== undefined ? instagram : techs[index].instagram,
        avatar_url: avatar_url !== undefined ? avatar_url : techs[index].avatar_url,
        mobile: mobile !== undefined ? mobile : techs[index].mobile,
        updated_at: now,
      };
      techs[index] = updated;
      return saveLocalTechs(techs) ? updated : null;
    }
  }

  // Insert brand new
  const newId = id || crypto.randomUUID();
  const newTech: NailTech = {
    id: newId,
    slug: slug || newId.slice(0, 8),
    name: name || '',
    city: city || '',
    instagram: instagram || '',
    avatar_url: avatar_url || '',
    mobile: mobile || '',
    created_at: now,
    updated_at: now,
  };
  techs.push(newTech);
  return saveLocalTechs(techs) ? newTech : null;
}

/**
 * Get nail technician profile by ID
 */
export async function getNailTechById(id: string): Promise<NailTech | null> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getNailTechById failed, checking local storage:', err);
    }
  }

  // Local Storage Fallback
  const techs = getLocalTechs();
  return techs.find(t => t.id === id) || null;
}

/**
 * Get nail technician profile by slug (for public vitrin)
 */
export async function getNailTechBySlug(slug: string): Promise<NailTech | null> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('nail_techs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getNailTechBySlug failed, checking local storage:', err);
    }
  }

  // Local Storage Fallback
  const techs = getLocalTechs();
  const found = techs.find(t => t.slug === slug);
  if (found) return found;
  if ((slug === 'profile' || slug === ':slug') && techs.length > 0) {
    return techs[0];
  }
  return null;
}

// ============================================
// DESIGNS - Database Operations
// ============================================

/**
 * Add a new design to the portfolio
 */
export async function addDesign(data: Omit<Design, 'id' | 'created_at' | 'updated_at'>): Promise<Design | null> {
  const { tech_id, title, image_url, tags, price, duration } = data;
  const now = new Date().toISOString();

  if (hasSupabaseCredentials) {
    try {
      await ensureAnonymousSession();
      const { data: userData } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('designs')
        .insert({
          id: crypto.randomUUID(),
          tech_id,
          title,
          image_url,
          tags,
          price,
          duration,
          owner_id: userData?.user?.id,
        })
        .select()
        .single();

      if (!error && result) return result;
      if (error) console.warn('Supabase addDesign error, falling back to local storage:', error);
    } catch (err) {
      console.warn('Supabase addDesign failed, falling back to local storage:', err);
    }
  }

  // Local Storage Fallback
  const designs = getLocalDesigns();
  const newDesign: Design = {
    id: crypto.randomUUID(),
    tech_id,
    title,
    image_url,
    tags,
    price,
    duration,
    created_at: now,
    updated_at: now,
  };
  designs.push(newDesign);
  return saveLocalDesigns(designs) ? newDesign : null;
}

/**
 * Get all designs for a specific nail tech
 */
export async function getDesigns(techId: string): Promise<Design[]> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('tech_id', techId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getDesigns failed, checking local storage:', err);
    }
  }

  // Local Storage Fallback
  const designs = getLocalDesigns();
  return designs
    .filter(d => d.tech_id === techId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Get a single design by ID
 */
export async function getDesignById(designId: string): Promise<Design | null> {
  if (hasSupabaseCredentials) {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', designId)
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getDesignById failed, checking local storage:', err);
    }
  }

  // Local Storage Fallback
  const designs = getLocalDesigns();
  return designs.find(d => d.id === designId) || null;
}

/**
 * Update a design
 */
export async function updateDesign(designId: string, updatedData: Partial<Omit<Design, 'id' | 'tech_id' | 'created_at' | 'updated_at'>>): Promise<Design | null> {
  const now = new Date().toISOString();

  if (hasSupabaseCredentials) {
    try {
      await ensureAnonymousSession();
      const { data, error } = await supabase
        .from('designs')
        .update({
          ...updatedData,
          updated_at: now,
        })
        .eq('id', designId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase updateDesign failed, falling back to local storage:', err);
    }
  }

  // Local Storage Fallback
  const designs = getLocalDesigns();
  const index = designs.findIndex(d => d.id === designId);
  if (index !== -1) {
    const updated: Design = {
      ...designs[index],
      ...updatedData,
      updated_at: now,
    } as Design;
    designs[index] = updated;
    saveLocalDesigns(designs);
    return updated;
  }
  return null;
}

/**
 * Delete a design
 */
export async function deleteDesign(designId: string): Promise<boolean> {
  if (hasSupabaseCredentials) {
    try {
      await ensureAnonymousSession();
      const { error } = await supabase
        .from('designs')
        .delete()
        .eq('id', designId);

      if (!error) return true;
    } catch (err) {
      console.warn('Supabase deleteDesign failed, falling back to local storage:', err);
    }
  }

  // Local Storage Fallback
  const designs = getLocalDesigns();
  const filtered = designs.filter(d => d.id !== designId);
  if (filtered.length !== designs.length) {
    saveLocalDesigns(filtered);
    return true;
  }
  return false;
}
