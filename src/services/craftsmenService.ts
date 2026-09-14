import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Craftsman } from '../types/database';
import { CraftsmanWithDetails, CraftsmanTransactionWithDetails } from '../types/models';
import { getLocalStore, saveLocalStore } from './localStorageData';
import { generateUUID } from '../lib/utils';
import { 
  calculateCraftsmanTotalMakingCost, 
  calculateCraftsmanTotalPureQuantity, 
  calculateCraftsmanTotalPaid, 
  calculateCraftsmanRemaining, 
  calculateItemPaid, 
  calculateItemRemaining,
  calculateCraftsmanGoldGiven,
  calculateCraftsmanGoldRemaining
} from '../lib/calculations/craftsmanCalculations';

export const craftsmenService = {
  async getAll(searchQuery = ''): Promise<CraftsmanWithDetails[]> {
    const term = searchQuery.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('craftsmen').select(`
        *,
        transactions:craftsman_transactions (
          id,
          transaction_date,
          materials_given:craftsman_materials_given (
            quantity
          ),
          items_received:craftsman_items_received (
            making_cost,
            pure_quantity
          ),
          payments:craftsman_payments (
            amount
          )
        )
      `).order('created_at', { ascending: false });

      if (term) {
        query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((craftsman: any) => {
        const transactions = craftsman.transactions || [];
        let totalMaking = 0;
        let totalPaid = 0;
        let totalGiven = 0;
        let totalPure = 0;

        transactions.forEach((tx: any) => {
          totalMaking += calculateCraftsmanTotalMakingCost(tx.items_received || []);
          totalPaid += calculateCraftsmanTotalPaid(tx.payments || []);
          totalGiven += calculateCraftsmanGoldGiven(tx.materials_given || []);
          totalPure += calculateCraftsmanTotalPureQuantity(tx.items_received || []);
        });

        return {
          id: craftsman.id,
          name: craftsman.name,
          phone: craftsman.phone,
          notes: craftsman.notes,
          created_at: craftsman.created_at,
          updated_at: craftsman.updated_at,
          transactions_count: transactions.length,
          total_making_charges: totalMaking,
          total_paid: totalPaid,
          total_remaining: calculateCraftsmanRemaining(totalMaking, totalPaid),
          total_pure_gold_given: totalGiven,
          total_pure_gold_received: totalPure,
          total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
        };
      });
    } else {
      const store = getLocalStore();
      let craftsmen = store.craftsmen;

      if (term) {
        craftsmen = craftsmen.filter(c =>
          c.name.toLowerCase().includes(term) ||
          (c.phone && c.phone.toLowerCase().includes(term))
        );
      }

      return craftsmen.map(c => {
        const txs = store.craftsman_transactions.filter(t => t.craftsman_id === c.id);
        let totalMaking = 0;
        let totalPaid = 0;
        let totalGiven = 0;
        let totalPure = 0;

        txs.forEach(tx => {
          const given = store.craftsman_materials_given.filter(g => g.transaction_id === tx.id);
          const items = store.craftsman_items_received.filter(i => i.transaction_id === tx.id);
          const payments = store.craftsman_payments.filter(p => p.transaction_id === tx.id);
          totalMaking += calculateCraftsmanTotalMakingCost(items);
          totalPaid += calculateCraftsmanTotalPaid(payments);
          totalGiven += calculateCraftsmanGoldGiven(given);
          totalPure += calculateCraftsmanTotalPureQuantity(items);
        });

        return {
          ...c,
          transactions_count: txs.length,
          total_making_charges: totalMaking,
          total_paid: totalPaid,
          total_remaining: calculateCraftsmanRemaining(totalMaking, totalPaid),
          total_pure_gold_given: totalGiven,
          total_pure_gold_received: totalPure,
          total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getById(id: string): Promise<CraftsmanWithDetails | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data: craftsman, error: craftsmanError } = await supabase
        .from('craftsmen')
        .select('*')
        .eq('id', id)
        .single();

      if (craftsmanError || !craftsman) return null;

      const { data: transactions, error: txError } = await supabase
        .from('craftsman_transactions')
        .select(`
          *,
          jewelry:jewelry_orders (*, client:clients(*)),
          materials_given:craftsman_materials_given (*),
          items_received:craftsman_items_received (*),
          payments:craftsman_payments (*)
        `)
        .eq('craftsman_id', id)
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;

      let totalMaking = 0;
      let totalPaid = 0;
      let totalGiven = 0;
      let totalPure = 0;

      const txWithDetails: CraftsmanTransactionWithDetails[] = (transactions || []).map((tx: any) => {
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

        const txGiven = calculateCraftsmanGoldGiven(tx.materials_given || []);
        const txPure = calculateCraftsmanTotalPureQuantity(itemsWithPayments);
        const txMaking = calculateCraftsmanTotalMakingCost(itemsWithPayments);
        const txPaid = calculateCraftsmanTotalPaid(tx.payments || []);

        totalMaking += txMaking;
        totalPaid += txPaid;
        totalGiven += txGiven;
        totalPure += txPure;

        return {
          ...tx,
          materials_given: tx.materials_given || [],
          items_received: itemsWithPayments,
          payments: tx.payments || [],
          total_pure_material: txPure,
          total_making_cost: txMaking,
          total_paid: txPaid,
          remaining_making_cost: calculateCraftsmanRemaining(txMaking, txPaid),
          total_pure_gold_given: txGiven,
          total_pure_gold_received: txPure,
          total_pure_gold_remaining: calculateCraftsmanGoldRemaining(txGiven, txPure),
        };
      });

      return {
        ...craftsman,
        transactions_count: txWithDetails.length,
        transactions: txWithDetails,
        total_making_charges: totalMaking,
        total_paid: totalPaid,
        total_remaining: calculateCraftsmanRemaining(totalMaking, totalPaid),
        total_pure_gold_given: totalGiven,
        total_pure_gold_received: totalPure,
        total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
      };
    } else {
      const store = getLocalStore();
      const craftsman = store.craftsmen.find(c => c.id === id);
      if (!craftsman) return null;

      const txs = store.craftsman_transactions
        .filter(t => t.craftsman_id === id)
        .map(tx => {
          const order = tx.jewelry_id ? store.jewelry_orders.find(j => j.id === tx.jewelry_id) : null;
          const client = order ? store.clients.find(c => c.id === order.client_id) : null;
          const jewelry = order ? { ...order, client: client || undefined } : undefined;

          const materialsGiven = store.craftsman_materials_given
            .filter(g => g.transaction_id === tx.id);

          const items = store.craftsman_items_received.filter(i => i.transaction_id === tx.id);
          const payments = store.craftsman_payments.filter(p => p.transaction_id === tx.id);

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

          const txGiven = calculateCraftsmanGoldGiven(materialsGiven);
          const txPure = calculateCraftsmanTotalPureQuantity(itemsWithPayments);
          const txMaking = calculateCraftsmanTotalMakingCost(itemsWithPayments);
          const txPaid = calculateCraftsmanTotalPaid(payments);

          return {
            ...tx,
            craftsman,
            jewelry,
            materials_given: materialsGiven,
            items_received: itemsWithPayments,
            payments,
            total_pure_material: txPure,
            total_making_cost: txMaking,
            total_paid: txPaid,
            remaining_making_cost: calculateCraftsmanRemaining(txMaking, txPaid),
            total_pure_gold_given: txGiven,
            total_pure_gold_received: txPure,
            total_pure_gold_remaining: calculateCraftsmanGoldRemaining(txGiven, txPure),
          };
        })
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      let totalMaking = 0;
      let totalPaid = 0;
      let totalGiven = 0;
      let totalPure = 0;
      txs.forEach(t => {
        totalMaking += t.total_making_cost;
        totalPaid += t.total_paid;
        totalGiven += t.total_pure_gold_given || 0;
        totalPure += t.total_pure_gold_received || 0;
      });

      return {
        ...craftsman,
        transactions_count: txs.length,
        transactions: txs,
        total_making_charges: totalMaking,
        total_paid: totalPaid,
        total_remaining: calculateCraftsmanRemaining(totalMaking, totalPaid),
        total_pure_gold_given: totalGiven,
        total_pure_gold_received: totalPure,
        total_pure_gold_remaining: calculateCraftsmanGoldRemaining(totalGiven, totalPure),
      };
    }
  },

  async create(craftsmanData: { name: string; phone?: string; notes?: string }): Promise<Craftsman> {
    const trimmedName = craftsmanData.name.trim();
    if (!trimmedName) throw new Error('Craftsman name is required');

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('craftsmen')
        .insert([{
          name: trimmedName,
          phone: craftsmanData.phone?.trim() || null,
          notes: craftsmanData.notes?.trim() || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const store = getLocalStore();
      const newCraftsman: Craftsman = {
        id: generateUUID(),
        name: trimmedName,
        phone: craftsmanData.phone?.trim() || null,
        notes: craftsmanData.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.craftsmen.unshift(newCraftsman);
      saveLocalStore(store);
      return newCraftsman;
    }
  },

  async update(id: string, craftsmanData: Partial<Craftsman>): Promise<Craftsman> {
    if (craftsmanData.name !== undefined && !craftsmanData.name.trim()) {
      throw new Error('Craftsman name cannot be empty');
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('craftsmen')
        .update({
          ...craftsmanData,
          name: craftsmanData.name?.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const store = getLocalStore();
      const index = store.craftsmen.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Craftsman not found');
      store.craftsmen[index] = {
        ...store.craftsmen[index],
        ...craftsmanData,
        name: craftsmanData.name !== undefined ? craftsmanData.name.trim() : store.craftsmen[index].name,
        updated_at: new Date().toISOString(),
      };
      saveLocalStore(store);
      return store.craftsmen[index];
    }
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('craftsmen').delete().eq('id', id);
      if (error) throw error;
    } else {
      const store = getLocalStore();
      const txIds = store.craftsman_transactions.filter(t => t.craftsman_id === id).map(t => t.id);
      store.craftsmen = store.craftsmen.filter(c => c.id !== id);
      store.craftsman_transactions = store.craftsman_transactions.filter(t => t.craftsman_id !== id);
      store.craftsman_materials_given = store.craftsman_materials_given.filter(g => !txIds.includes(g.transaction_id));
      store.craftsman_items_received = store.craftsman_items_received.filter(i => !txIds.includes(i.transaction_id));
      store.craftsman_payments = store.craftsman_payments.filter(p => !txIds.includes(p.transaction_id));
      saveLocalStore(store);
    }
  }
};
