import { supabase, hasSupabaseCredentials } from './supabaseClient';

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

function saveLocalTechs(techs: NailTech[]) {
  try {
    localStorage.setItem(TECHS_KEY, JSON.stringify(techs));
  } catch (err) {
    console.error('Error saving local techs:', err);
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

function saveLocalDesigns(designs: Design[]) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  } catch (err) {
    console.error('Error saving local designs:', err);
  }
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
      if (id) {
        // Update existing
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
      saveLocalTechs(techs);
      return updated;
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
  saveLocalTechs(techs);
  return newTech;
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
  saveLocalDesigns(designs);
  return newDesign;
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
