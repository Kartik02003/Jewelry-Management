import { JewelryMaterial, ClientPayment } from '../../types/database';

/**
 * Calculates the total cost for a single material line row: quantity * (unit_cost + making_rate)
 */
export function calculateJewelryMaterialTotal(quantity: number, unitCost: number, makingRate: number = 0): number {
  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;
  const making = Number(makingRate) || 0;
  return Math.round((qty * (cost + making)) * 100) / 100;
}

/**
 * Calculates total jewelry cost by summing all material row totals (including making)
 */
export function calculateJewelryTotal(materials: Array<Pick<JewelryMaterial, 'quantity' | 'unit_cost'> & { making_rate?: number }>): number {
  if (!materials || !Array.isArray(materials)) return 0;
  const sum = materials.reduce((acc, item) => {
    return acc + calculateJewelryMaterialTotal(item.quantity, item.unit_cost, (item as any).making_rate || 0);
  }, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates total paid amount for a jewelry piece by summing all client payments
 */
export function calculateClientTotalPaid(payments: Array<Pick<ClientPayment, 'amount'>>): number {
  if (!payments || !Array.isArray(payments)) return 0;
  const sum = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates the remaining balance for a jewelry order.
 * Ensures it doesn't return negative values.
 */
export function calculateClientRemaining(totalCost: number, totalPaid: number): number {
  const diff = (Number(totalCost) || 0) - (Number(totalPaid) || 0);
  return Math.max(0, Math.round(diff * 100) / 100);
}

/**
 * Validates a client payment amount against the remaining balance.
 */
export function validateClientPayment(amount: number, remaining: number): { isValid: boolean; error?: string } {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Payment amount must be greater than 0' };
  }
  if (numAmount > remaining + 0.001) {
    return { isValid: false, error: `Payment cannot exceed the remaining balance of ₹${remaining.toLocaleString('en-IN')}` };
  }
  return { isValid: true };
}

/**
 * Calculates total pure gold quantity in grams for a jewelry order
 */
export function calculateJewelryPureGold(materials: Array<{ material_name: string; quantity: number; purity_percentage?: number; pure_quantity?: number }>): number {
  if (!materials || !Array.isArray(materials)) return 0;
  const sum = materials.reduce((acc, m) => {
    if (m.material_name && m.material_name.toLowerCase().startsWith('gold')) {
      if (m.pure_quantity && Number(m.pure_quantity) > 0) {
        return acc + Number(m.pure_quantity);
      }
      if (m.purity_percentage && Number(m.purity_percentage) > 0) {
        return acc + (Number(m.quantity) * Number(m.purity_percentage)) / 100;
      }
    }
    return acc;
  }, 0);
  return Math.round(sum * 1000) / 1000;
}

/**
 * Calculates total pure gold received from a client
 */
export function calculateClientTotalGoldReceived(records: Array<{ quantity: number }>): number {
  if (!records || !Array.isArray(records)) return 0;
  const sum = records.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  return Math.round(sum * 1000) / 1000;
}

/**
 * Calculates remaining pure gold left to be received
 */
export function calculateClientGoldRemaining(totalPureGold: number, totalReceived: number): number {
  const diff = (Number(totalPureGold) || 0) - (Number(totalReceived) || 0);
  return Math.max(0, Math.round(diff * 1000) / 1000);
}
