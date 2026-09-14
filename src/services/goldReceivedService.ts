import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { ClientGoldReceived } from '../types/database';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';

export const goldReceivedService = {
  async getByClientId(clientId: string): Promise<ClientGoldReceived[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('client_gold_received')
        .select('*')
        .eq('client_id', clientId)
        .order('received_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      const store = getLocalStore();
      const records = (store.client_gold_received || []).filter(r => r.client_id === clientId);
      return records.sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());
    }
  },

  async add(data: {
    client_id: string;
    quantity: number;
    received_date: string;
    notes?: string;
  }): Promise<ClientGoldReceived> {
    const qty = Number(data.quantity);
    if (!qty || qty <= 0) throw new Error('Quantity must be greater than 0');
    if (!data.received_date) throw new Error('Received date is required');

    const now = new Date().toISOString();
    const id = generateUUID();

    if (isSupabaseConfigured() && supabase) {
      const { data: record, error } = await supabase
        .from('client_gold_received')
        .insert([{
          id,
          client_id: data.client_id,
          quantity: qty,
          received_date: data.received_date,
          notes: data.notes?.trim() || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return record;
    } else {
      const store = getLocalStore();
      if (!store.client_gold_received) store.client_gold_received = [];
      const newRecord: ClientGoldReceived = {
        id,
        client_id: data.client_id,
        quantity: qty,
        received_date: data.received_date,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      };
      store.client_gold_received.push(newRecord);
      saveLocalStore(store);
      return newRecord;
    }
  },

  async update(id: string, data: { quantity: number; received_date: string; notes?: string }): Promise<void> {
    const qty = Number(data.quantity);
    if (!qty || qty <= 0) throw new Error('Quantity must be greater than 0');
    if (!data.received_date) throw new Error('Received date is required');

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('client_gold_received')
        .update({
          quantity: qty,
          received_date: data.received_date,
          notes: data.notes?.trim() || null,
          updated_at: now,
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      const store = getLocalStore();
      if (!store.client_gold_received) store.client_gold_received = [];
      const idx = store.client_gold_received.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Record not found');

      store.client_gold_received[idx] = {
        ...store.client_gold_received[idx],
        quantity: qty,
        received_date: data.received_date,
        notes: data.notes?.trim() || null,
        updated_at: now,
      };
      saveLocalStore(store);
    }
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('client_gold_received').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      if (!store.client_gold_received) store.client_gold_received = [];
      store.client_gold_received = store.client_gold_received.filter(r => r.id !== id);
      saveLocalStore(store);
    }
  }
};
