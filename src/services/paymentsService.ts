import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { ClientPayment, CraftsmanPayment } from '../types/database';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';
import { jewelryService } from './jewelryService';
import { transactionsService } from './transactionsService';
import { validateClientPayment } from '../lib/calculations/jewelryCalculations';
import { validateCraftsmanPayment } from '../lib/calculations/craftsmanCalculations';

export const paymentsService = {
  // CLIENT PAYMENTS
  async getByClientId(clientId: string): Promise<ClientPayment[]> {
    if (isSupabaseConfigured() && supabase) {
      // Get all jewelry orders for this client as well for backwards compatibility
      const { data: orders } = await supabase
        .from('jewelry_orders')
        .select('id')
        .eq('client_id', clientId);
      const orderIds = (orders || []).map(o => o.id);

      let query = supabase.from('client_payments').select('*');
      if (orderIds.length > 0) {
        query = query.or(`client_id.eq.${clientId},jewelry_id.in.(${orderIds.join(',')})`);
      } else {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const store = getLocalStore();
      const orderIds = store.jewelry_orders.filter(j => j.client_id === clientId).map(j => j.id);
      return store.client_payments
        .filter(p => p.client_id === clientId || orderIds.includes(p.jewelry_id || ''))
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    }
  },

  async addClientPayment(data: {
    client_id: string;
    jewelry_id?: string;
    amount: number;
    payment_date: string;
    notes?: string;
  }): Promise<ClientPayment> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (!data.payment_date) throw new Error('Payment date is required');

    const now = new Date().toISOString();
    const paymentId = generateUUID();

    if (isSupabaseConfigured() && supabase) {
      const { data: payment, error } = await supabase
        .from('client_payments')
        .insert([{
          id: paymentId,
          client_id: data.client_id,
          jewelry_id: data.jewelry_id || null,
          amount,
          payment_date: data.payment_date,
          notes: data.notes?.trim() || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return payment;
    } else {
      const store = getLocalStore();
      const newPayment: ClientPayment = {
        id: paymentId,
        client_id: data.client_id,
        jewelry_id: data.jewelry_id || null,
        amount,
        payment_date: data.payment_date,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      };
      store.client_payments.push(newPayment);
      saveLocalStore(store);
      return newPayment;
    }
  },

  async updateClientPayment(id: string, data: { amount: number; payment_date: string; notes?: string }): Promise<void> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (!data.payment_date) throw new Error('Payment date is required');

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('client_payments')
        .update({
          amount,
          payment_date: data.payment_date,
          notes: data.notes?.trim() || null,
          updated_at: now,
        })
        .eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      const idx = store.client_payments.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Payment not found');

      store.client_payments[idx] = {
        ...store.client_payments[idx],
        amount,
        payment_date: data.payment_date,
        notes: data.notes?.trim() || null,
        updated_at: now,
      };
      saveLocalStore(store);
    }
  },

  async deleteClientPayment(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('client_payments').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.client_payments = store.client_payments.filter(p => p.id !== id);
      saveLocalStore(store);
    }
  },

  // CRAFTSMAN PAYMENTS
  async addCraftsmanPayment(data: {
    craftsman_id: string;
    transaction_id?: string;
    item_received_id?: string | null;
    amount: number;
    payment_date: string;
    notes?: string;
  }): Promise<CraftsmanPayment> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (!data.payment_date) throw new Error('Payment date is required');

    let txId = data.transaction_id;
    if (!txId) {
      txId = await transactionsService.getOrCreateActiveTransaction(data.craftsman_id);
    }

    const now = new Date().toISOString();
    const paymentId = generateUUID();

    if (isSupabaseConfigured() && supabase) {
      const payload: any = {
        id: paymentId,
        craftsman_id: data.craftsman_id,
        transaction_id: txId,
        item_received_id: data.item_received_id || null,
        amount,
        payment_date: data.payment_date,
        notes: data.notes?.trim() || null,
      };

      let { data: payment, error } = await supabase
        .from('craftsman_payments')
        .insert([payload])
        .select()
        .single();

      // Graceful fallback if database column still has NOT NULL constraint before migration is run
      if (error && error.message && error.message.includes('item_received_id')) {
        const { data: items } = await supabase
          .from('craftsman_items_received')
          .select('id')
          .eq('transaction_id', txId)
          .limit(1);

        if (items && items.length > 0) {
          payload.item_received_id = items[0].id;
          const retry = await supabase
            .from('craftsman_payments')
            .insert([payload])
            .select()
            .single();
          if (!retry.error) {
            payment = retry.data;
            error = null;
          }
        }
      }

      if (error) throw error;
      return payment;
    } else {
      const store = getLocalStore();
      const newPayment: CraftsmanPayment = {
        id: paymentId,
        craftsman_id: data.craftsman_id,
        transaction_id: txId,
        item_received_id: data.item_received_id || null,
        amount,
        payment_date: data.payment_date,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      };
      store.craftsman_payments.push(newPayment);
      saveLocalStore(store);
      return newPayment;
    }
  },

  async updateCraftsmanPayment(id: string, data: { amount: number; payment_date: string; notes?: string }): Promise<void> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (!data.payment_date) throw new Error('Payment date is required');

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('craftsman_payments')
        .update({
          amount,
          payment_date: data.payment_date,
          notes: data.notes?.trim() || null,
          updated_at: now,
        })
        .eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      const idx = store.craftsman_payments.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Payment not found');

      store.craftsman_payments[idx] = {
        ...store.craftsman_payments[idx],
        amount,
        payment_date: data.payment_date,
        notes: data.notes?.trim() || null,
        updated_at: now,
      };
      saveLocalStore(store);
    }
  },

  async deleteCraftsmanPayment(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_payments').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.craftsman_payments = store.craftsman_payments.filter(p => p.id !== id);
      saveLocalStore(store);
    }
  }
};
