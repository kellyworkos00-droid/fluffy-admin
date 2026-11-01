import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Photo } from '@/lib/types';

/**
 * Shrinks a phone photo before upload. A 6 MB camera shot becomes a few hundred
 * KB, which is what keeps the site fast on mobile data.
 */
async function shrink(file: File, maxSide: number): Promise<Blob> {
  if (file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    return blob && blob.type === 'image/webp' ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, folder: string, maxSide = 1600): Promise<Photo> {
  const supabase = supabaseBrowser();
  const blob = await shrink(file, maxSide);
  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/svg+xml' ? 'svg' : blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('site-images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return { path, url: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl };
}
