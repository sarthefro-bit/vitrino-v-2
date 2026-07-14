# 🚀 Supabase Integration Guide

## Step 1: Configure Environment Variables

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: **Supabase Dashboard → Settings → API**

---

## Step 2: Database Schema

Your Supabase tables should have this structure:

### `nail_techs` Table
```sql
id (uuid, primary key)
slug (text, unique)
name (text)
city (text)
instagram (text)
avatar_url (text)
created_at (timestamp)
updated_at (timestamp)
```

### `designs` Table
```sql
id (uuid, primary key)
tech_id (uuid, foreign key → nail_techs.id)
title (text)
image_url (text)
tags (text[], array)
price (integer)
duration (integer)
created_at (timestamp)
updated_at (timestamp)
```

### Storage Buckets (Public)
- `avatars` — For profile pictures
- `designs` — For design portfolio images

---

## Step 3: Usage Examples

### Save Nail Tech Profile

```typescript
import { saveNailTech } from '@/lib/db';
import { uploadImage } from '@/lib/storage';

// Upload avatar
const avatarUrl = await uploadImage(avatarFile, 'avatars', 'tech-123');

// Save profile
const tech = await saveNailTech({
  slug: 'fatima-nailer',
  name: 'فاطیما',
  city: 'تهران',
  instagram: '@fatima_nails',
  avatar_url: avatarUrl || '',
});

console.log('✅ Profile saved:', tech);
```

---

### Add Design to Portfolio

```typescript
import { addDesign } from '@/lib/db';
import { uploadImage } from '@/lib/storage';

// Upload design image
const imageUrl = await uploadImage(designFile, 'designs', 'tech-123');

// Add to portfolio
const design = await addDesign({
  tech_id: 'tech-uuid-here',
  title: 'ناخن‌های صورتی',
  image_url: imageUrl || '',
  tags: ['صورتی', 'ساده', 'تابستانی'],
  price: 150000,
  duration: 45,
});

console.log('✅ Design added:', design);
```

---

### Fetch Public Vitrin

```typescript
import { getNailTechBySlug, getDesigns } from '@/lib/db';

// Get nail tech by slug (for public vitrin)
const tech = await getNailTechBySlug('fatima-nailer');

if (tech) {
  // Get all designs
  const designs = await getDesigns(tech.id);
  console.log(`📋 ${designs.length} designs found`);
}
```

---

### Update Design

```typescript
import { updateDesign } from '@/lib/db';

const updated = await updateDesign('design-id', {
  title: 'ناخن‌های صورتی (ویرایش‌شده)',
  price: 200000,
});
```

---

### Delete Design

```typescript
import { deleteDesign } from '@/lib/db';
import { deleteImage } from '@/lib/storage';

// Delete from database
const deleted = await deleteDesign('design-id');

// Delete image from storage
if (deleted) {
  await deleteImage('designs', 'tech-123/old-image.jpg');
}
```

---

## Step 4: Update Your React Components

### Example: Setup.tsx

```typescript
import { useState } from 'react';
import { saveNailTech, addDesign } from '@/lib/db';
import { uploadImage } from '@/lib/storage';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [techId, setTechId] = useState<string | null>(null);

  const handleSaveProfile = async (formData) => {
    setLoading(true);
    try {
      const avatarUrl = await uploadImage(formData.avatarFile, 'avatars');
      
      const tech = await saveNailTech({
        slug: formData.slug,
        name: formData.name,
        city: formData.city,
        instagram: formData.instagram,
        avatar_url: avatarUrl || '',
      });

      if (tech) {
        setTechId(tech.id);
        console.log('✅ Profile saved!');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return <div>/* Your form here */</div>;
}
```

---

## Step 5: Error Handling

All functions include `try-catch` blocks and log errors to console. In production, handle errors gracefully:

```typescript
const tech = await getNailTechBySlug('slug');

if (!tech) {
  // Show error message to user
  setError('پروفایل یافت نشد');
  return;
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `.env.local` not loaded | Restart dev server: `npm run dev` |
| 401 Unauthorized | Check `VITE_SUPABASE_ANON_KEY` |
| Storage permission denied | Make sure buckets are set to **Public** in Supabase |
| Image upload fails | Check file size (max 5MB) and type (JPEG, PNG, WebP, GIF) |

---

## 🎯 Next Steps

1. ✅ Set up `.env.local` with your credentials
2. ✅ Create database tables and buckets in Supabase
3. ✅ Update Setup.tsx to use `saveNailTech()` and `uploadImage()`
4. ✅ Update Vitrin.tsx to fetch data with `getNailTechBySlug()` and `getDesigns()`
5. ✅ Test in browser: `npm run dev`
