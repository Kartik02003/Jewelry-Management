import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { generateUUID } from '../lib/utils';

export const storageService = {
  async uploadJewelryImage(file: File, jewelryId: string): Promise<string> {
    if (isSupabaseConfigured() && supabase) {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${jewelryId}/${Date.now()}-${generateUUID().slice(0, 8)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('jewelry-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('jewelry-images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } else {
      // Fallback: Convert file to Base64 data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }
  },

  async deleteJewelryImage(storagePath: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      // If full URL, extract path
      let path = storagePath;
      if (storagePath.includes('/jewelry-images/')) {
        path = storagePath.split('/jewelry-images/')[1];
      }
      const { error } = await supabase.storage.from('jewelry-images').remove([path]);
      if (error) {
        console.error('Supabase storage delete error:', error);
      }
    }
  }
};
