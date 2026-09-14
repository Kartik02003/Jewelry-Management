/**
 * Formats a number to Indian Rupee currency format (e.g. ₹10,00,000 or ₹9,400)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  
  // Format with en-IN locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return `₹${formatted}`;
}

/**
 * Formats a number to clean decimal representation without unnecessary trailing zeros
 */
export function formatQuantity(qty: number | null | undefined, unit?: string): string {
  if (qty === null || qty === undefined || isNaN(qty)) {
    return unit ? `0 ${unit}` : '0';
  }
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(qty);

  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into Indian display format (e.g. 10 Sep 2026)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD for date inputs
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
