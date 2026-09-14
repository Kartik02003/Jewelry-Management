import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { CraftsmanTransaction } from '../types/database';
import { CraftsmanTransactionWithDetails } from '../types/models';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';
import { 
  calculatePureQuantity, 
  calculateCraftsmanTotalMakingCost, 
  calculateCraftsmanTotalPureQuantity, 
  calculateCraftsmanTotalPaid, 
  calculateCraftsmanRemaining, 
  calculateItemPaid, 
  calculateItemRemaining,
  calculateCraftsmanGoldGiven,
  calculateCraftsmanGoldRemaining
} from '../lib/calculations/craftsmanCalculations';

export interface CreateTransactionInput {
  craftsman_id: string;
  jewelry_id?: string | null;
  transaction_date: string;
  notes?: string;
  materials_given: Array<{
    material_name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  items_received: Array<{
    item_name: string;
    gross_quantity: number;
    unit: string;
    carat?: string;
    purity_percentage: number;
    pure_quantity: number;
    cost_per_gram?: number;
    making_cost: number;
    received_date?: string;
    notes?: string;
  }>;
}

export const transactionsService = {
  async getById(id: string): Promise<CraftsmanTransactionWithDetails | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data: tx, error: txError } = await supabase
        .from('craftsman_transactions')
        .select(`
          *,
          craftsman:craftsmen (*),
          jewelry:jewelry_orders (*, client:clients(*)),
          materials_given:craftsman_materials_given (*),
          items_received:craftsman_items_received (*),
          payments:craftsman_payments (*)
        `)
        .eq('id', id)
        .single();

      if (txError || !tx) return null;

      const itemsWithPayments = (tx.items_received || []).map((item: any) => {
        const itemPayments = (tx.payments || []).filter((p: any) => p.item_received_id === item.id);
        const itemPaid = calculateItemPaid(itemPayments, item.id);
        return {
          ...item,
          payments: itemPayments,
          total_paid: itemPaid,
          remaining_making_cost: calculateItemRemaining(item.making_cost, itemPaid),
        };
      });

      const totalGiven = calculateCraftsmanGoldGiven(tx.materials_given || []);
      const totalPure = calculateCraftsmanTotalPureQuantity(itemsWithPayments);
      const totalMaking = calculateCraftsmanTotalMakingCost(itemsWithPayments);
      const totalPaid = calculateCraftsmanTotalPaid(tx.payments || []);

      return {
        ...tx,
        materials_given: tx.materials_given || [],
        items_received: itemsWithPayments,
        payments: (tx.payments || []).sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
        total_pure_material: totalPure,
        total_making_cost: totalMaking,
        total_paid: totalPaid,
        remaining_making_cost: calculateCraftsmanRemaining(totalMaking, totalPaid),
        total_pure_gold_given: totalGiven,
        total_pure_gold_received: totalPure,
        total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
      };
    } else {
      const store = getLocalStore();
      const tx = store.craftsman_transactions.find(t => t.id === id);
      if (!tx) return null;

      const craftsman = store.craftsmen.find(c => c.id === tx.craftsman_id);
      const order = tx.jewelry_id ? store.jewelry_orders.find(j => j.id === tx.jewelry_id) : null;
      const client = order ? store.clients.find(c => c.id === order.client_id) : null;
      const jewelry = order ? { ...order, client: client || undefined } : undefined;

      const materialsGiven = store.craftsman_materials_given.filter(g => g.transaction_id === tx.id);
      const items = store.craftsman_items_received.filter(i => i.transaction_id === tx.id);
      const payments = store.craftsman_payments
        .filter(p => p.transaction_id === tx.id)
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      const itemsWithPayments = items.map(item => {
        const itemPayments = payments.filter(p => p.item_received_id === item.id);
        const itemPaid = calculateItemPaid(itemPayments, item.id);
        return {
          ...item,
          payments: itemPayments,
          total_paid: itemPaid,
          remaining_making_cost: calculateItemRemaining(item.making_cost, itemPaid),
        };
      });

      const totalGiven = calculateCraftsmanGoldGiven(materialsGiven);
      const totalPure = calculateCraftsmanTotalPureQuantity(itemsWithPayments);
      const totalMaking = calculateCraftsmanTotalMakingCost(itemsWithPayments);
      const totalPaid = calculateCraftsmanTotalPaid(payments);

      return {
        ...tx,
        craftsman,
        jewelry,
        materials_given: materialsGiven,
        items_received: itemsWithPayments,
        payments,
        total_pure_material: totalPure,
        total_making_cost: totalMaking,
        total_paid: totalPaid,
        remaining_making_cost: calculateCraftsmanRemaining(totalMaking, totalPaid),
        total_pure_gold_given: totalGiven,
        total_pure_gold_received: totalPure,
        total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
      };
    }
  },

  async create(data: CreateTransactionInput): Promise<CraftsmanTransaction> {
    if (!data.craftsman_id) throw new Error('Craftsman is required');
    if (!data.transaction_date) throw new Error('Transaction date is required');

    const txId = generateUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      // 1. Insert transaction
      const { data: tx, error: txError } = await supabase
        .from('craftsman_transactions')
        .insert([{
          id: txId,
          craftsman_id: data.craftsman_id,
          jewelry_id: data.jewelry_id || null,
          transaction_date: data.transaction_date,
          notes: data.notes?.trim() || null,
        }])
        .select()
        .single();

      if (txError) throw txError;

      // 2. Insert materials given
      if (data.materials_given && data.materials_given.length > 0) {
        const givenToInsert = data.materials_given.map(g => ({
          transaction_id: tx.id,
          material_name: g.material_name.trim(),
          quantity: Number(g.quantity) || 0,
          unit: g.unit || 'g',
          notes: g.notes?.trim() || null,
        }));
        const { error: gError } = await supabase.from('craftsman_materials_given').insert(givenToInsert);
        if (gError) throw gError;
      }

      // 3. Insert items received
      if (data.items_received && data.items_received.length > 0) {
        const itemsToInsert = data.items_received.map(item => {
          const gross = Number(item.gross_quantity) || 0;
          const purity = Number(item.purity_percentage) || 0;
          const pure = calculatePureQuantity(gross, purity);
          return {
            transaction_id: tx.id,
            item_name: item.item_name.trim(),
            gross_quantity: gross,
            unit: item.unit || 'g',
            carat: item.carat || '22',
            purity_percentage: purity,
            pure_quantity: pure,
            cost_per_gram: Number(item.cost_per_gram) || 0,
            making_cost: Number(item.making_cost) || 0,
            received_date: item.received_date || tx.transaction_date,
            notes: item.notes?.trim() || null,
          };
        });
        const { error: iError } = await supabase.from('craftsman_items_received').insert(itemsToInsert);
        if (iError) throw iError;
      }

      return tx;
    } else {
      const store = getLocalStore();
      const newTx: CraftsmanTransaction = {
        id: txId,
        craftsman_id: data.craftsman_id,
        jewelry_id: data.jewelry_id || null,
        transaction_date: data.transaction_date,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      };

      store.craftsman_transactions.unshift(newTx);

      if (data.materials_given && data.materials_given.length > 0) {
        data.materials_given.forEach(g => {
          store.craftsman_materials_given.push({
            id: generateUUID(),
            transaction_id: txId,
            material_name: g.material_name.trim(),
            quantity: Number(g.quantity) || 0,
            unit: g.unit || 'g',
            notes: g.notes?.trim() || null,
            created_at: now,
          });
        });
      }

      if (data.items_received && data.items_received.length > 0) {
        data.items_received.forEach(item => {
          const gross = Number(item.gross_quantity) || 0;
          const purity = Number(item.purity_percentage) || 0;
          const pure = calculatePureQuantity(gross, purity);
          store.craftsman_items_received.push({
            id: generateUUID(),
            transaction_id: txId,
            item_name: item.item_name.trim(),
            gross_quantity: gross,
            unit: item.unit || 'g',
            carat: item.carat || '22',
            purity_percentage: purity,
            pure_quantity: pure,
            cost_per_gram: Number(item.cost_per_gram) || 0,
            making_cost: Number(item.making_cost) || 0,
            received_date: item.received_date || data.transaction_date,
            notes: item.notes?.trim() || null,
            created_at: now,
            updated_at: now,
          });
        });
      }

      saveLocalStore(store);
      return newTx;
    }
  },

  async update(id: string, data: Partial<CreateTransactionInput>): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      if (data.transaction_date !== undefined || data.jewelry_id !== undefined || data.notes !== undefined) {
        const { error } = await supabase
          .from('craftsman_transactions')
          .update({
            jewelry_id: data.jewelry_id !== undefined ? (data.jewelry_id || null) : undefined,
            transaction_date: data.transaction_date,
            notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
            updated_at: now,
          })
          .eq('id', id);
        if (error) throw error;
      }

      if (data.materials_given !== undefined) {
        await supabase.from('craftsman_materials_given').delete().eq('transaction_id', id);
        if (data.materials_given.length > 0) {
          const toInsert = data.materials_given.map(g => ({
            transaction_id: id,
            material_name: g.material_name.trim(),
            quantity: Number(g.quantity) || 0,
            unit: g.unit || 'g',
            notes: g.notes?.trim() || null,
          }));
          await supabase.from('craftsman_materials_given').insert(toInsert);
        }
      }

      if (data.items_received !== undefined) {
        await supabase.from('craftsman_items_received').delete().eq('transaction_id', id);
        if (data.items_received.length > 0) {
          const itemsToInsert = data.items_received.map(item => {
            const gross = Number(item.gross_quantity) || 0;
            const purity = Number(item.purity_percentage) || 0;
            const pure = calculatePureQuantity(gross, purity);
            return {
              transaction_id: id,
              item_name: item.item_name.trim(),
              gross_quantity: gross,
              unit: item.unit || 'g',
              carat: item.carat || '22',
              purity_percentage: purity,
              pure_quantity: pure,
              cost_per_gram: Number(item.cost_per_gram) || 0,
              making_cost: Number(item.making_cost) || 0,
              received_date: item.received_date || now.split('T')[0],
              notes: item.notes?.trim() || null,
            };
          });
          await supabase.from('craftsman_items_received').insert(itemsToInsert);
        }
      }
    } else {
      const store = getLocalStore();
      const txIdx = store.craftsman_transactions.findIndex(t => t.id === id);
      if (txIdx === -1) throw new Error('Transaction not found');

      store.craftsman_transactions[txIdx] = {
        ...store.craftsman_transactions[txIdx],
        jewelry_id: data.jewelry_id !== undefined ? (data.jewelry_id || null) : store.craftsman_transactions[txIdx].jewelry_id,
        transaction_date: data.transaction_date || store.craftsman_transactions[txIdx].transaction_date,
        notes: data.notes !== undefined ? (data.notes?.trim() || null) : store.craftsman_transactions[txIdx].notes,
        updated_at: now,
      };

      if (data.materials_given !== undefined) {
        store.craftsman_materials_given = store.craftsman_materials_given.filter(g => g.transaction_id !== id);
        data.materials_given.forEach(g => {
          store.craftsman_materials_given.push({
            id: generateUUID(),
            transaction_id: id,
            material_name: g.material_name.trim(),
            quantity: Number(g.quantity) || 0,
            unit: g.unit || 'g',
            notes: g.notes?.trim() || null,
            created_at: now,
          });
        });
      }

      if (data.items_received !== undefined) {
        const oldItemIds = store.craftsman_items_received.filter(i => i.transaction_id === id).map(i => i.id);
        store.craftsman_items_received = store.craftsman_items_received.filter(i => i.transaction_id !== id);
        store.craftsman_payments = store.craftsman_payments.filter(p => !p.item_received_id || !oldItemIds.includes(p.item_received_id));

        data.items_received.forEach(item => {
          const gross = Number(item.gross_quantity) || 0;
          const purity = Number(item.purity_percentage) || 0;
          const pure = calculatePureQuantity(gross, purity);
          store.craftsman_items_received.push({
            id: generateUUID(),
            transaction_id: id,
            item_name: item.item_name.trim(),
            gross_quantity: gross,
            unit: item.unit || 'g',
            carat: item.carat || '22',
            purity_percentage: purity,
            pure_quantity: pure,
            cost_per_gram: Number(item.cost_per_gram) || 0,
            making_cost: Number(item.making_cost) || 0,
            received_date: item.received_date || store.craftsman_transactions[txIdx].transaction_date,
            notes: item.notes?.trim() || null,
            created_at: now,
            updated_at: now,
          });
        });
      }

      saveLocalStore(store);
    }
  },

  async addItemReceived(data: {
    transaction_id: string;
    item_name: string;
    gross_quantity: number;
    unit?: string;
    carat?: string;
    purity_percentage: number;
    pure_quantity: number;
    cost_per_gram?: number;
    making_cost: number;
    received_date?: string;
    notes?: string;
  }): Promise<void> {
    const gross = Number(data.gross_quantity) || 0;
    const purity = Number(data.purity_percentage) || 0;
    const pure = calculatePureQuantity(gross, purity);
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_items_received').insert([{
        transaction_id: data.transaction_id,
        item_name: data.item_name.trim(),
        gross_quantity: gross,
        unit: data.unit || 'g',
        carat: data.carat || '22',
        purity_percentage: purity,
        pure_quantity: pure,
        cost_per_gram: Number(data.cost_per_gram) || 0,
        making_cost: Number(data.making_cost) || 0,
        received_date: data.received_date || new Date().toISOString().split('T')[0],
        notes: data.notes?.trim() || null,
      }]);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.craftsman_items_received.push({
        id: generateUUID(),
        transaction_id: data.transaction_id,
        item_name: data.item_name.trim(),
        gross_quantity: gross,
        unit: data.unit || 'g',
        carat: data.carat || '22',
        purity_percentage: purity,
        pure_quantity: pure,
        cost_per_gram: Number(data.cost_per_gram) || 0,
        making_cost: Number(data.making_cost) || 0,
        received_date: data.received_date || new Date().toISOString().split('T')[0],
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      });
      saveLocalStore(store);
    }
  },

  async deleteItemReceived(itemId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_items_received').delete().eq('id', itemId);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.craftsman_items_received = store.craftsman_items_received.filter(i => i.id !== itemId);
      store.craftsman_payments = store.craftsman_payments.filter(p => p.item_received_id !== itemId);
      saveLocalStore(store);
    }
  },

  async addGoldGiven(data: {
    transaction_id: string;
    material_name?: string;
    quantity: number;
    unit?: string;
    given_date?: string;
    notes?: string;
  }): Promise<void> {
    const qty = Number(data.quantity) || 0;
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_materials_given').insert([{
        transaction_id: data.transaction_id,
        material_name: data.material_name?.trim() || 'Pure Gold',
        quantity: qty,
        unit: data.unit || 'g',
        notes: data.notes?.trim() || null,
      }]);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.craftsman_materials_given.push({
        id: generateUUID(),
        transaction_id: data.transaction_id,
        material_name: data.material_name?.trim() || 'Pure Gold',
        quantity: qty,
        unit: data.unit || 'g',
        notes: data.notes?.trim() || null,
        created_at: now,
      });
      saveLocalStore(store);
    }
  },

  async deleteGoldGiven(givenId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_materials_given').delete().eq('id', givenId);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      store.craftsman_materials_given = store.craftsman_materials_given.filter(g => g.id !== givenId);
      saveLocalStore(store);
    }
  },

  async getOrCreateActiveTransaction(craftsmanId: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase
        .from('craftsman_transactions')
        .select('id')
        .eq('craftsman_id', craftsmanId)
        .order('transaction_date', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        return data[0].id;
      }
      const newId = generateUUID();
      const { error } = await supabase.from('craftsman_transactions').insert([{
        id: newId,
        craftsman_id: craftsmanId,
        transaction_date: today,
      }]);
      if (error) throw error;
      return newId;
    } else {
      const store = getLocalStore();
      const existing = store.craftsman_transactions
        .filter(t => t.craftsman_id === craftsmanId)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())[0];
      if (existing) return existing.id;
      const newId = generateUUID();
      const now = new Date().toISOString();
      store.craftsman_transactions.unshift({
        id: newId,
        craftsman_id: craftsmanId,
        jewelry_id: null,
        transaction_date: today,
        created_at: now,
        updated_at: now,
      });
      saveLocalStore(store);
      return newId;
    }
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsman_transactions').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      const itemIds = store.craftsman_items_received.filter(i => i.transaction_id === id).map(i => i.id);
      store.craftsman_transactions = store.craftsman_transactions.filter(t => t.id !== id);
      store.craftsman_materials_given = store.craftsman_materials_given.filter(g => g.transaction_id !== id);
      store.craftsman_items_received = store.craftsman_items_received.filter(i => i.transaction_id !== id);
      store.craftsman_payments = store.craftsman_payments.filter(p => p.transaction_id !== id && (!p.item_received_id || !itemIds.includes(p.item_received_id)));
      saveLocalStore(store);
    }
  }
};
