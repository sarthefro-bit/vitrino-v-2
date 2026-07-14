import { supabase, hasSupabaseCredentials } from './supabaseClient';

// Helper to convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// ============================================
// IMAGE UPLOAD UTILITY
// ============================================

/**
 * Upload an image file to Supabase Storage and return the public URL, or Base64 as fallback
 */
export async function uploadImage(
  file: File,
  bucketName: 'avatars' | 'designs',
  folderPath: string = ''
): Promise<string | null> {
  try {
    // Validate file
    if (!file) {
      throw new Error('❌ No file provided');
    }

    // Allowed image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('❌ Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }

    // Max file size: 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('❌ File size exceeds 5MB limit');
    }

    if (hasSupabaseCredentials) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = crypto.randomUUID().slice(0, 8);
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${timestamp}-${randomId}.${ext}`;

        // Build full path
        const fullPath = folderPath ? `${folderPath}/${filename}` : filename;

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, file);

        if (!error) {
          // Get public URL
          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fullPath);

          const publicUrl = publicData?.publicUrl;

          if (publicUrl) {
            console.log(`✅ Image uploaded successfully to Supabase: ${publicUrl}`);
            return publicUrl;
          }
        } else {
          console.warn('Supabase storage upload error, falling back to local base64:', error);
        }
      } catch (err) {
        console.warn('Supabase storage upload failed, falling back to local base64:', err);
      }
    }

    // Local Base64 Fallback
    console.log('Using local offline Base64 image fallback.');
    return await fileToBase64(file);
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  bucketName: 'avatars' | 'designs',
  filePath: string
): Promise<boolean> {
  if (hasSupabaseCredentials && !filePath.startsWith('data:image')) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) throw error;

      console.log(`✅ Image deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      return false;
    }
  }
  return true;
}

/**
 * Get a signed URL for a private image
 */
export async function getSignedUrl(
  bucketName: 'avatars' | 'designs',
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (hasSupabaseCredentials && !filePath.startsWith('data:image')) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('❌ Error creating signed URL:', error);
      return null;
    }
  }
  return filePath;
}
