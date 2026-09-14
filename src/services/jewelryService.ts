import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { JewelryOrder } from '../types/database';
import { JewelryWithDetails, CraftsmanTransactionWithDetails } from '../types/models';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';
import { calculateJewelryTotal, calculateClientTotalPaid, calculateClientRemaining } from '../lib/calculations/jewelryCalculations';
import { calculateCraftsmanTotalMakingCost, calculateCraftsmanTotalPureQuantity, calculateCraftsmanTotalPaid, calculateCraftsmanRemaining, calculateItemPaid, calculateItemRemaining } from '../lib/calculations/craftsmanCalculations';
import { storageService } from './storageService';

export const jewelryService = {
  async getAll(searchQuery = ''): Promise<JewelryWithDetails[]> {
    const term = searchQuery.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('jewelry_orders').select(`
        *,
        client:clients (*),
        images:jewelry_images (*),
        materials:jewelry_materials (*),
        payments:client_payments (*)
      `).order('created_at', { ascending: false });

      if (term) {
        query = query.ilike('name', `%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((order: any) => {
        const total = calculateJewelryTotal(order.materials || []);
        const paid = calculateClientTotalPaid(order.payments || []);
        return {
          ...order,
          images: order.images || [],
          materials: order.materials || [],
          payments: order.payments || [],
          craftsman_transactions: [],
          total_material_cost: total,
          total_paid: paid,
          remaining_amount: calculateClientRemaining(total, paid),
        };
      });
    } else {
      const store = getLocalStore();
      let orders = store.jewelry_orders;

      if (term) {
        orders = orders.filter(o => o.name.toLowerCase().includes(term));
      }

      return orders.map(order => this.buildDetailsFromLocalStore(order.id, store))
        .filter((o): o is JewelryWithDetails => o !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getByClientId(clientId: string): Promise<JewelryWithDetails[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('jewelry_orders')
        .select(`
          *,
          client:clients (*),
          images:jewelry_images (*),
          materials:jewelry_materials (*),
          payments:client_payments (*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((order: any) => {
        const total = calculateJewelryTotal(order.materials || []);
        const paid = calculateClientTotalPaid(order.payments || []);
        return {
          ...order,
          images: order.images || [],
          materials: order.materials || [],
          payments: order.payments || [],
          craftsman_transactions: [],
          total_material_cost: total,
          total_paid: paid,
          remaining_amount: calculateClientRemaining(total, paid),
        };
      });
    } else {
      const store = getLocalStore();
      const orders = store.jewelry_orders.filter(j => j.client_id === clientId);
      return orders
        .map(o => this.buildDetailsFromLocalStore(o.id, store))
        .filter((o): o is JewelryWithDetails => o !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getById(jewelryId: string): Promise<JewelryWithDetails | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data: order, error: orderError } = await supabase
        .from('jewelry_orders')
        .select(`
          *,
          client:clients (*),
          images:jewelry_images (*),
          materials:jewelry_materials (*),
          payments:client_payments (*)
        `)
        .eq('id', jewelryId)
        .single();

      if (orderError || !order) return null;

      const total = calculateJewelryTotal(order.materials || []);
      const paid = calculateClientTotalPaid(order.payments || []);

      return {
        ...order,
        images: order.images || [],
        materials: order.materials || [],
        payments: (order.payments || []).sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
        craftsman_transactions: [],
        total_material_cost: total,
        total_paid: paid,
        remaining_amount: calculateClientRemaining(total, paid),
      };
    } else {
      const store = getLocalStore();
      return this.buildDetailsFromLocalStore(jewelryId, store);
    }
  },

  buildDetailsFromLocalStore(jewelryId: string, store: ReturnType<typeof getLocalStore>): JewelryWithDetails | null {
    const order = store.jewelry_orders.find(j => j.id === jewelryId);
    if (!order) return null;

    const client = store.clients.find(c => c.id === order.client_id);
    const images = store.jewelry_images.filter(img => img.jewelry_id === jewelryId);
    const materials = store.jewelry_materials.filter(m => m.jewelry_id === jewelryId);

    const payments = store.client_payments
      .filter(p => p.jewelry_id === jewelryId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    const total = calculateJewelryTotal(materials);
    const paid = calculateClientTotalPaid(payments);

    return {
      ...order,
      client,
      images,
      materials,
      payments,
      craftsman_transactions: [],
      total_material_cost: total,
      total_paid: paid,
      remaining_amount: calculateClientRemaining(total, paid),
    };
  },

  async create(data: {
    client_id: string;
    name: string;
    description?: string;
    materials: Array<{ 
      material_name: string; 
      quantity: number; 
      unit: string; 
      unit_cost: number; 
      making_rate?: number;
      purity_percentage?: number;
      pure_quantity?: number;
    }>;
    imageFile?: File | null;
  }): Promise<JewelryOrder> {
    const trimmedName = data.name.trim();
    if (!trimmedName) throw new Error('Jewelry name is required');
    if (!data.client_id) throw new Error('Client is required');

    const jewelryId = generateUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      // 1. Insert order
      const { data: order, error: orderError } = await supabase
        .from('jewelry_orders')
        .insert([{
          id: jewelryId,
          client_id: data.client_id,
          name: trimmedName,
          description: data.description?.trim() || null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert materials
      if (data.materials && data.materials.length > 0) {
        const materialsToInsert = data.materials.map(m => ({
          jewelry_id: order.id,
          material_name: m.material_name.trim(),
          quantity: Number(m.quantity) || 0,
          unit: m.unit || 'g',
          unit_cost: Number(m.unit_cost) || 0,
          making_rate: Number(m.making_rate) || 0,
          purity_percentage: Number(m.purity_percentage) || 0,
          pure_quantity: Number(m.pure_quantity) || 0,
        }));

        const { error: matError } = await supabase
          .from('jewelry_materials')
          .insert(materialsToInsert);
        if (matError) throw matError;
      }

      // 3. Upload image if provided
      if (data.imageFile) {
        try {
          const imagePath = await storageService.uploadJewelryImage(data.imageFile, order.id);
          await supabase.from('jewelry_images').insert([{
            jewelry_id: order.id,
            storage_path: imagePath,
          }]);
        } catch (imgErr) {
          console.error('Failed to upload image:', imgErr);
        }
      }

      return order;
    } else {
      const store = getLocalStore();
      const newOrder: JewelryOrder = {
        id: jewelryId,
        client_id: data.client_id,
        name: trimmedName,
        description: data.description?.trim() || null,
        created_at: now,
        updated_at: now,
      };

      store.jewelry_orders.unshift(newOrder);

      // Add materials
      if (data.materials && data.materials.length > 0) {
        data.materials.forEach(m => {
          store.jewelry_materials.push({
            id: generateUUID(),
            jewelry_id: jewelryId,
            material_name: m.material_name.trim(),
            quantity: Number(m.quantity) || 0,
            unit: m.unit || 'g',
            unit_cost: Number(m.unit_cost) || 0,
            making_rate: Number(m.making_rate) || 0,
            purity_percentage: Number(m.purity_percentage) || 0,
            pure_quantity: Number(m.pure_quantity) || 0,
            created_at: now,
            updated_at: now,
          });
        });
      }

      // Add image
      if (data.imageFile) {
        const imagePath = await storageService.uploadJewelryImage(data.imageFile, jewelryId);
        store.jewelry_images.push({
          id: generateUUID(),
          jewelry_id: jewelryId,
          storage_path: imagePath,
          created_at: now,
        });
      }

      saveLocalStore(store);
      return newOrder;
    }
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    materials?: Array<{ 
      material_name: string; 
      quantity: number; 
      unit: string; 
      unit_cost: number; 
      making_rate?: number;
      purity_percentage?: number;
      pure_quantity?: number;
    }>;
    newImageFile?: File | null;
    removeExistingImage?: boolean;
    removeImageId?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      if (data.name !== undefined) {
        const { error: orderError } = await supabase
          .from('jewelry_orders')
          .update({
            name: data.name.trim(),
            description: data.description?.trim() || null,
            updated_at: now,
          })
          .eq('id', id);
        if (orderError) throw orderError;
      }

      if (data.materials !== undefined) {
        await supabase.from('jewelry_materials').delete().eq('jewelry_id', id);
        if (data.materials.length > 0) {
          const toInsert = data.materials.map(m => ({
            jewelry_id: id,
            material_name: m.material_name.trim(),
            quantity: Number(m.quantity) || 0,
            unit: m.unit || 'g',
            unit_cost: Number(m.unit_cost) || 0,
            making_rate: Number(m.making_rate) || 0,
            purity_percentage: Number(m.purity_percentage) || 0,
            pure_quantity: Number(m.pure_quantity) || 0,
          }));
          await supabase.from('jewelry_materials').insert(toInsert);
        }
      }

      // Handle image deletion or replacement
      if (data.removeExistingImage || data.newImageFile || data.removeImageId) {
        const { data: existingImgs } = await supabase
          .from('jewelry_images')
          .select('id, storage_path')
          .eq('jewelry_id', id);

        if (existingImgs && existingImgs.length > 0) {
          for (const img of existingImgs) {
            try {
              await storageService.deleteJewelryImage(img.storage_path);
            } catch (delErr) {
              console.error('Error deleting old image:', delErr);
            }
          }
          await supabase.from('jewelry_images').delete().eq('jewelry_id', id);
        }
      }

      // Handle new image upload
      if (data.newImageFile) {
        const imagePath = await storageService.uploadJewelryImage(data.newImageFile, id);
        await supabase.from('jewelry_images').insert([{
          jewelry_id: id,
          storage_path: imagePath,
        }]);
      }
    } else {
      const store = getLocalStore();
      const orderIdx = store.jewelry_orders.findIndex(j => j.id === id);
      if (orderIdx === -1) throw new Error('Jewelry order not found');

      if (data.name !== undefined) {
        store.jewelry_orders[orderIdx] = {
          ...store.jewelry_orders[orderIdx],
          name: data.name.trim(),
          description: data.description?.trim() || null,
          updated_at: now,
        };
      }

      if (data.materials !== undefined) {
        store.jewelry_materials = store.jewelry_materials.filter(m => m.jewelry_id !== id);
        data.materials.forEach(m => {
          store.jewelry_materials.push({
            id: generateUUID(),
            jewelry_id: id,
            material_name: m.material_name.trim(),
            quantity: Number(m.quantity) || 0,
            unit: m.unit || 'g',
            unit_cost: Number(m.unit_cost) || 0,
            making_rate: Number(m.making_rate) || 0,
            created_at: now,
            updated_at: now,
          });
        });
      }

      if (data.removeExistingImage || data.newImageFile || data.removeImageId) {
        store.jewelry_images = store.jewelry_images.filter(img => img.jewelry_id !== id);
      }

      if (data.newImageFile) {
        const imagePath = await storageService.uploadJewelryImage(data.newImageFile, id);
        store.jewelry_images.push({
          id: generateUUID(),
          jewelry_id: id,
          storage_path: imagePath,
          created_at: now,
        });
      }

      saveLocalStore(store);
    }
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('jewelry_orders').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.jewelry_orders = store.jewelry_orders.filter(j => j.id !== id);
      store.jewelry_materials = store.jewelry_materials.filter(m => m.jewelry_id !== id);
      store.jewelry_images = store.jewelry_images.filter(img => img.jewelry_id !== id);
      store.client_payments = store.client_payments.filter(p => p.jewelry_id !== id);
      store.craftsman_transactions = store.craftsman_transactions.map(t => 
        t.jewelry_id === id ? { ...t, jewelry_id: null } : t
      );
      saveLocalStore(store);
    }
  }
};
