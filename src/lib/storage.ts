import { supabase, hasSupabaseCredentials } from './supabaseClient';
import { addLog } from './logger';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Upload an image file to Supabase Storage and return public URL, or Base64 as fallback
 */
export async function uploadImage(
  file: File,
  bucketName: 'avatars' | 'designs',
  folderPath: string = ''
): Promise<string | null> {
  try {
    if (!file) {
      throw new Error('فایلی برای آپلود انتخاب نشده است');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('فرمت فایل مجاز نیست. فقط تصویر JPEG, PNG, WebP و GIF پشتیبانی می‌شود.');
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
    }

    if (hasSupabaseCredentials) {
      try {
        const timestamp = Date.now();
        const randomId = crypto.randomUUID().slice(0, 8);
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${timestamp}-${randomId}.${ext}`;
        const fullPath = folderPath ? `${folderPath}/${filename}` : filename;

        const { error } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, file, { upsert: true });

        if (!error) {
          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fullPath);

          const publicUrl = publicData?.publicUrl;
          if (publicUrl) {
            addLog('success', 'storage', `تصویر با موفقیت در Supabase (${bucketName}) ذخیره شد.`, { url: publicUrl });
            return publicUrl;
          }
        } else {
          addLog('warn', 'storage', `خطا در آپلود تصویر به باکت Supabase (${bucketName}): ${error.message}. انتقال به Base64 محلی.`, error);
        }
      } catch (err) {
        addLog('warn', 'storage', `استثنا در آپلود به Supabase Storage. انتقال به Base64 محلی.`, err);
      }
    }

    // Local Base64 Fallback
    addLog('info', 'storage', 'استفاده از فرمت Base64 محلی جهت ذخیره‌سازی تصویر.');
    return await fileToBase64(file);
  } catch (error) {
    addLog('error', 'storage', 'خطا در آپلود تصویر', error);
    return null;
  }
}

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
      addLog('info', 'storage', `تصویر با موفقیت از باکت Supabase حذف شد: ${filePath}`);
      return true;
    } catch (error) {
      addLog('warn', 'storage', `خطا در حذف تصویر از Supabase`, error);
      return false;
    }
  }
  return true;
}
