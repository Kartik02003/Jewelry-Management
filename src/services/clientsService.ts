import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Client } from '../types/database';
import { ClientWithDetails } from '../types/models';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';
import { 
  calculateJewelryTotal, 
  calculateClientTotalPaid, 
  calculateClientRemaining,
  calculateJewelryPureGold,
  calculateClientTotalGoldReceived,
  calculateClientGoldRemaining
} from '../lib/calculations/jewelryCalculations';

export const clientsService = {
  async getAll(searchQuery = ''): Promise<ClientWithDetails[]> {
    const term = searchQuery.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('clients').select(`
        *,
        jewelry_orders (
          id,
          name,
          jewelry_materials (
            material_name,
            quantity,
            unit_cost,
            making_rate,
            purity_percentage,
            pure_quantity
          )
        ),
        client_payments (
          id,
          amount
        ),
        client_gold_received (
          id,
          quantity
        )
      `).order('created_at', { ascending: false });

      if (term) {
        query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((client: any) => {
        const orders = client.jewelry_orders || [];
        const payments = client.client_payments || [];
        const goldReceived = client.client_gold_received || [];
        let totalValue = 0;
        let totalPureGold = 0;

        orders.forEach((o: any) => {
          const mats = o.jewelry_materials || [];
          totalValue += calculateJewelryTotal(mats);
          totalPureGold += calculateJewelryPureGold(mats);
        });

        const totalPaid = calculateClientTotalPaid(payments);
        const totalGoldReceived = calculateClientTotalGoldReceived(goldReceived);

        return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          notes: client.notes,
          created_at: client.created_at,
          updated_at: client.updated_at,
          jewelry_orders_count: orders.length,
          total_order_value: totalValue,
          total_paid: totalPaid,
          total_remaining: calculateClientRemaining(totalValue, totalPaid),
          total_pure_gold: totalPureGold,
          total_gold_received: totalGoldReceived,
          total_gold_remaining: calculateClientGoldRemaining(totalPureGold, totalGoldReceived),
        };
      });
    } else {
      const store = getLocalStore();
      let filtered = store.clients;

      if (term) {
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(term) || 
          (c.phone && c.phone.toLowerCase().includes(term))
        );
      }

      return filtered.map(client => {
        const orders = store.jewelry_orders.filter(j => j.client_id === client.id);
        const orderIds = orders.map(o => o.id);
        const payments = store.client_payments.filter(p => p.client_id === client.id || orderIds.includes(p.jewelry_id || ''));
        const goldReceived = (store.client_gold_received || []).filter(r => r.client_id === client.id);
        let totalValue = 0;
        let totalPureGold = 0;

        orders.forEach(order => {
          const materials = store.jewelry_materials.filter(m => m.jewelry_id === order.id);
          totalValue += calculateJewelryTotal(materials);
          totalPureGold += calculateJewelryPureGold(materials);
        });
        const totalPaid = calculateClientTotalPaid(payments);
        const totalGoldReceived = calculateClientTotalGoldReceived(goldReceived);

        return {
          ...client,
          jewelry_orders_count: orders.length,
          total_order_value: totalValue,
          total_paid: totalPaid,
          total_remaining: calculateClientRemaining(totalValue, totalPaid),
          total_pure_gold: totalPureGold,
          total_gold_received: totalGoldReceived,
          total_gold_remaining: calculateClientGoldRemaining(totalPureGold, totalGoldReceived),
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getById(id: string): Promise<ClientWithDetails | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return data;
    } else {
      const store = getLocalStore();
      return store.clients.find(c => c.id === id) || null;
    }
  },

  async create(clientData: { name: string; phone?: string; notes?: string }): Promise<Client> {
    const trimmedName = clientData.name.trim();
    if (!trimmedName) throw new Error('Client name is required');

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: trimmedName,
          phone: clientData.phone?.trim() || null,
          notes: clientData.notes?.trim() || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const store = getLocalStore();
      const newClient: Client = {
        id: generateUUID(),
        name: trimmedName,
        phone: clientData.phone?.trim() || null,
        notes: clientData.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.clients.unshift(newClient);
      saveLocalStore(store);
      return newClient;
    }
  },

  async update(id: string, clientData: Partial<Client>): Promise<Client> {
    if (clientData.name !== undefined && !clientData.name.trim()) {
      throw new Error('Client name cannot be empty');
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .update({
          ...clientData,
          name: clientData.name?.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const store = getLocalStore();
      const index = store.clients.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Client not found');
      store.clients[index] = {
        ...store.clients[index],
        ...clientData,
        name: clientData.name !== undefined ? clientData.name.trim() : store.clients[index].name,
        updated_at: new Date().toISOString(),
      };
      saveLocalStore(store);
      return store.clients[index];
    }
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      // Cascade delete orders
      const orderIds = store.jewelry_orders.filter(j => j.client_id === id).map(j => j.id);
      store.clients = store.clients.filter(c => c.id !== id);
      store.jewelry_orders = store.jewelry_orders.filter(j => j.client_id !== id);
      store.jewelry_materials = store.jewelry_materials.filter(m => !orderIds.includes(m.jewelry_id));
      store.jewelry_images = store.jewelry_images.filter(img => !orderIds.includes(img.jewelry_id));
      store.client_payments = store.client_payments.filter(p => p.client_id !== id && !orderIds.includes(p.jewelry_id || ''));
      // unlink transactions
      store.craftsman_transactions = store.craftsman_transactions.map(t => 
        orderIds.includes(t.jewelry_id || '') ? { ...t, jewelry_id: null } : t
      );
      saveLocalStore(store);
    }
  }
};
