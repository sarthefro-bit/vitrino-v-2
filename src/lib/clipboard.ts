/**
 * Extract an image file from a paste event (ClipboardEvent)
 */
export function getPastedImageFile(e: React.ClipboardEvent | ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        const ext = blob.type.split('/')[1] || 'png';
        return new File([blob], `pasted_image_${Date.now()}.${ext}`, { type: blob.type });
      }
    }
  }
  return null;
}

/**
 * Read image directly from system clipboard using Async Clipboard API
 */
export async function readImageFromClipboard(): Promise<File | null> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      return null;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const ext = type.split('/')[1] || 'png';
          return new File([blob], `pasted_image_${Date.now()}.${ext}`, { type });
        }
      }
    }
  } catch (err) {
    console.warn('Clipboard read image error:', err);
  }
  return null;
}
