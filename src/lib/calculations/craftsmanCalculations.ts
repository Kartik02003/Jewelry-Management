import { CraftsmanItemReceived, CraftsmanPayment } from '../../types/database';

export const CARAT_PURITY_MAP: Record<string, number> = {
  '24': 100,
  '22': 92,
  '18': 76,
  '14': 59,
};

export function getPurityFromCarat(carat: string): number {
  return CARAT_PURITY_MAP[carat] ?? 92;
}

/**
 * Calculates pure material quantity: gross_quantity * purity_percentage / 100
 * Supports decimals (e.g. 64 * 59 / 100 = 37.76)
 */
export function calculatePureQuantity(grossQuantity: number, purityPercentage: number): number {
  const gross = Number(grossQuantity) || 0;
  const purity = Number(purityPercentage) || 0;
  const pure = (gross * purity) / 100;
  // Round to 3 decimal places for precision without floating point weirdness
  return Math.round(pure * 1000) / 1000;
}

/**
 * Calculates item total cost: weight (quantity) * cost_per_gram
 */
export function calculateItemCost(weight: number, costPerGram: number): number {
  const w = Number(weight) || 0;
  const c = Number(costPerGram) || 0;
  return Math.round((w * c) * 100) / 100;
}

/**
 * Calculates total making / item charges from a list of returned items.
 */
export function calculateCraftsmanTotalMakingCost(items: Array<Pick<CraftsmanItemReceived, 'making_cost'>>): number {
  if (!items || !Array.isArray(items)) return 0;
  const sum = items.reduce((acc, item) => acc + (Number(item.making_cost) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates total pure gold given to a craftsman
 */
export function calculateCraftsmanGoldGiven(materialsGiven: Array<{ quantity: number }>): number {
  if (!materialsGiven || !Array.isArray(materialsGiven)) return 0;
  const sum = materialsGiven.reduce((acc, g) => acc + (Number(g.quantity) || 0), 0);
  return Math.round(sum * 1000) / 1000;
}

/**
 * Calculates remaining pure gold with craftsman (Given - Received)
 */
export function calculateCraftsmanGoldRemaining(totalGiven: number, totalReceived: number): number {
  const diff = (Number(totalGiven) || 0) - (Number(totalReceived) || 0);
  return Math.round(diff * 1000) / 1000;
}

/**
 * Calculates total pure quantity sum for a list of items
 */
export function calculateCraftsmanTotalPureQuantity(items: Array<Pick<CraftsmanItemReceived, 'pure_quantity'>>): number {
  if (!items || !Array.isArray(items)) return 0;
  const sum = items.reduce((acc, item) => acc + (Number(item.pure_quantity) || 0), 0);
  return Math.round(sum * 1000) / 1000;
}

/**
 * Calculates total payments made for a specific returned item
 */
export function calculateItemPaid(payments: Array<Pick<CraftsmanPayment, 'amount' | 'item_received_id'>>, itemId: string): number {
  if (!payments || !Array.isArray(payments)) return 0;
  const sum = payments
    .filter(p => p.item_received_id === itemId)
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates remaining making cost for a specific returned item
 */
export function calculateItemRemaining(makingCost: number, itemPaid: number): number {
  const diff = (Number(makingCost) || 0) - (Number(itemPaid) || 0);
  return Math.max(0, Math.round(diff * 100) / 100);
}

/**
 * Calculates total paid amount for a craftsman or transaction
 */
export function calculateCraftsmanTotalPaid(payments: Array<Pick<CraftsmanPayment, 'amount'>>): number {
  if (!payments || !Array.isArray(payments)) return 0;
  const sum = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates remaining craftsman making balance
 */
export function calculateCraftsmanRemaining(totalMaking: number, totalPaid: number): number {
  const diff = (Number(totalMaking) || 0) - (Number(totalPaid) || 0);
  return Math.max(0, Math.round(diff * 100) / 100);
}

/**
 * Validates a craftsman payment amount against the item's remaining making cost
 */
export function validateCraftsmanPayment(amount: number, remaining: number): { isValid: boolean; error?: string } {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Payment amount must be greater than 0' };
  }
  if (numAmount > remaining + 0.001) {
    return { isValid: false, error: `Payment cannot exceed remaining making amount of ₹${remaining.toLocaleString('en-IN')}` };
  }
  return { isValid: true };
}
