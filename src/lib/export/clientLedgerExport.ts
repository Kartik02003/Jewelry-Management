import * as XLSX from 'xlsx';
import { ClientWithDetails, JewelryWithDetails } from '../../types/models';
import { ClientPayment, ClientGoldReceived } from '../../types/database';
import { formatINR, formatDate, formatQuantity } from '../calculations/formatters';
import {
  calculateJewelryTotal,
  calculateJewelryMaterialTotal,
  calculateJewelryPureGold
} from '../calculations/jewelryCalculations';

export interface ClientLedgerData {
  client: ClientWithDetails;
  jewelryOrders: JewelryWithDetails[];
  payments: ClientPayment[];
  goldRecords: ClientGoldReceived[];
}

/**
 * Generates clean, structured, formatted text representing the entire client ledger.
 */
export function generateClientLedgerText(data: ClientLedgerData): string {
  const { client, jewelryOrders, payments, goldRecords } = data;
  const today = formatDate(new Date().toISOString());

  // Calculate totals
  let totalOrderValue = 0;
  let totalPureGoldRequired = 0;

  jewelryOrders.forEach((order) => {
    const mats = order.materials || [];
    const orderCost = calculateJewelryTotal(mats);
    const pureGold = calculateJewelryPureGold(mats);
    totalOrderValue += orderCost;
    totalPureGoldRequired += pureGold;
  });

  const totalCredit = payments
    .filter(p => p.payment_type !== 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalDebit = payments
    .filter(p => p.payment_type === 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaid = totalCredit - totalDebit;
  const totalPendingBalance = Math.max(0, totalOrderValue - totalPaid);

  const totalGoldReceived = goldRecords.reduce((acc, g) => acc + (Number(g.quantity) || 0), 0);
  const goldBalanceRemaining = Math.max(0, totalPureGoldRequired - totalGoldReceived);

  const lines: string[] = [];

  lines.push('========================================');
  lines.push('          ⚜️  CLIENT LEDGER  ⚜️');
  lines.push('========================================');
  lines.push(`Client Name : ${client.name}`);
  if (client.phone) {
    lines.push(`Phone Number: ${client.phone}`);
  }
  lines.push(`Date        : ${today}`);
  lines.push('========================================\n');

  // 1. Jewelry Orders
  lines.push(`📦 JEWELRY ORDERS (${jewelryOrders.length} Items):`);
  lines.push('----------------------------------------');

  if (jewelryOrders.length === 0) {
    lines.push('No jewelry orders recorded.\n');
  } else {
    jewelryOrders.forEach((order, idx) => {
      const mats = order.materials || [];
      const orderCost = calculateJewelryTotal(mats);
      const pureGold = calculateJewelryPureGold(mats);

      lines.push(`${idx + 1}. ${order.name.toUpperCase()}`);
      if (order.created_at) {
        lines.push(`   • Created on: ${formatDate(order.created_at)}`);
      }
      if (order.description) {
        lines.push(`   • Notes: ${order.description}`);
      }

      // Materials breakdown
      if (mats.length > 0) {
        lines.push('   • Materials / Specifications:');
        mats.forEach((m) => {
          const qty = Number(m.quantity) || 0;
          // Normalize unit: if unit was saved as '22K' or any carat, weight unit is 'g'
          const unit = (!m.unit || /^\d+k$/i.test(m.unit.trim())) ? 'g' : m.unit;
          const unitCost = Number(m.unit_cost) || 0;
          const makingRate = Number(m.making_rate) || 0;
          const matCost = calculateJewelryMaterialTotal(qty, unitCost, makingRate);
          const purity = Number(m.purity_percentage) || 0;
          const pureMat = Number(m.pure_quantity) || (purity > 0 ? (qty * purity) / 100 : 0);

          lines.push(`     - ${m.material_name}:`);
          lines.push(`       Quantity: ${formatQuantity(qty, unit)} | Rate: ${formatINR(unitCost)}/${unit}`);
          if (makingRate > 0) {
            lines.push(`       Making Rate: ${formatINR(makingRate)}/${unit}`);
          }
          if (pureMat > 0) {
            lines.push(`       Pure Gold: ${pureMat.toFixed(2)} g`);
          }
          lines.push(`       Material Total: ${formatINR(matCost)}`);
        });
      }

      lines.push(`   💰 Total Jewelry Cost: ${formatINR(orderCost)}`);
      if (pureGold > 0) {
        lines.push(`   ✨ Total Pure Gold: ${pureGold.toFixed(2)} g`);
      }
      lines.push('');
    });
  }

  // 2. Pure Gold Ledger
  lines.push('✨ PURE GOLD STATEMENT:');
  lines.push('----------------------------------------');
  lines.push(`• Total Pure Gold Required: ${totalPureGoldRequired.toFixed(2)} g`);
  lines.push(`• Pure Gold Received (${goldRecords.length} entries):`);

  if (goldRecords.length === 0) {
    lines.push('  (No gold received entries recorded)');
  } else {
    goldRecords.forEach((g) => {
      const noteStr = g.notes ? ` (${g.notes})` : '';
      lines.push(`  - ${formatDate(g.received_date)}: ${Number(g.quantity).toFixed(2)} g${noteStr}`);
    });
  }

  lines.push(`• Total Gold Received: ${totalGoldReceived.toFixed(2)} g`);
  lines.push(`• PURE GOLD BALANCE DUE: ${goldBalanceRemaining.toFixed(2)} g\n`);

  // 3. Financial & Payments Ledger
  lines.push('💰 FINANCIAL & PAYMENT LEDGER:');
  lines.push('----------------------------------------');
  lines.push(`• Total Orders Value: ${formatINR(totalOrderValue)}`);
  lines.push(`• Payments & Transactions (${payments.length} entries):`);

  if (payments.length === 0) {
    lines.push('  (No payments recorded yet)');
  } else {
    payments.forEach((p) => {
      const isDebit = p.payment_type === 'debit';
      const noteStr = p.notes ? ` (${p.notes})` : '';
      const typeStr = isDebit ? '[DEBIT - Paid to Client]' : '[CREDIT - Received]';
      const signStr = isDebit ? '-' : '+';
      lines.push(`  - ${formatDate(p.payment_date)}: ${signStr}${formatINR(p.amount)} ${typeStr}${noteStr}`);
    });
  }

  lines.push(`• Total Received (Credit): ${formatINR(totalCredit)}`);
  if (totalDebit > 0) {
    lines.push(`• Total Paid to Client (Debit): ${formatINR(totalDebit)}`);
  }
  lines.push(`• Net Amount Paid: ${formatINR(totalPaid)}`);
  lines.push(`• PENDING BALANCE DUE: ${formatINR(totalPendingBalance)}`);
  lines.push('========================================');

  return lines.join('\n');
}

/**
 * Generates and triggers download of a formatted Excel spreadsheet (.xlsx) containing the full client ledger.
 */
export function exportClientLedgerToExcel(data: ClientLedgerData): void {
  const { client, jewelryOrders, payments, goldRecords } = data;
  const today = formatDate(new Date().toISOString());

  // Calculate totals
  let totalOrderValue = 0;
  let totalPureGoldRequired = 0;

  jewelryOrders.forEach((order) => {
    const mats = order.materials || [];
    const orderCost = calculateJewelryTotal(mats);
    const pureGold = calculateJewelryPureGold(mats);
    totalOrderValue += orderCost;
    totalPureGoldRequired += pureGold;
  });

  const totalCredit = payments
    .filter(p => p.payment_type !== 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalDebit = payments
    .filter(p => p.payment_type === 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaid = totalCredit - totalDebit;
  const totalPendingBalance = Math.max(0, totalOrderValue - totalPaid);

  const totalGoldReceived = goldRecords.reduce((acc, g) => acc + (Number(g.quantity) || 0), 0);
  const goldBalanceRemaining = Math.max(0, totalPureGoldRequired - totalGoldReceived);

  // Workbook creation
  const wb = XLSX.utils.book_new();

  // --- SHEET 1: COMPLETE CLIENT LEDGER ---
  const sheetRows: any[][] = [];

  // Title & Client Info
  sheetRows.push(['CLIENT LEDGER STATEMENT']);
  sheetRows.push(['Client Name:', client.name]);
  sheetRows.push(['Phone Number:', client.phone || 'N/A']);
  sheetRows.push(['Statement Date:', today]);
  sheetRows.push([]);

  // Overview Summary Table
  sheetRows.push(['OVERVIEW SUMMARY', '']);
  sheetRows.push(['Total Order Value (₹)', totalOrderValue]);
  sheetRows.push(['Total Received - Credit (₹)', totalCredit]);
  sheetRows.push(['Total Paid to Client - Debit (₹)', totalDebit]);
  sheetRows.push(['Net Amount Paid (₹)', totalPaid]);
  sheetRows.push(['Pending Balance Due (₹)', totalPendingBalance]);
  sheetRows.push(['Total Pure Gold Required (g)', totalPureGoldRequired]);
  sheetRows.push(['Total Pure Gold Received (g)', totalGoldReceived]);
  sheetRows.push(['Pure Gold Balance Due (g)', goldBalanceRemaining]);
  sheetRows.push([]);

  // Section 1: Jewelry Items & Materials Breakdown
  sheetRows.push(['JEWELRY ORDERS BREAKDOWN']);
  sheetRows.push([
    'Item S.No',
    'Item Name',
    'Created On',
    'Material Name',
    'Quantity',
    'Unit',
    'Rate (₹/unit)',
    'Making Rate (₹/unit)',
    'Purity (%)',
    'Pure Gold (g)',
    'Material Total (₹)',
    'Jewelry Total (₹)'
  ]);

  if (jewelryOrders.length === 0) {
    sheetRows.push(['No jewelry orders recorded']);
  } else {
    jewelryOrders.forEach((order, itemIdx) => {
      const mats = order.materials || [];
      const orderCost = calculateJewelryTotal(mats);

      if (mats.length === 0) {
        sheetRows.push([
          itemIdx + 1,
          order.name,
          order.created_at ? formatDate(order.created_at) : '',
          'No materials recorded',
          '',
          '',
          '',
          '',
          '',
          '',
          0,
          orderCost
        ]);
      } else {
        mats.forEach((m, matIdx) => {
          const qty = Number(m.quantity) || 0;
          const unit = (!m.unit || /^\d+k$/i.test(m.unit.trim())) ? 'g' : m.unit;
          const rate = Number(m.unit_cost) || 0;
          const makingRate = Number(m.making_rate) || 0;
          const purity = Number(m.purity_percentage) || 0;
          const pureMat = Number(m.pure_quantity) || (purity > 0 ? (qty * purity) / 100 : 0);
          const matCost = calculateJewelryMaterialTotal(qty, rate, makingRate);

          sheetRows.push([
            matIdx === 0 ? itemIdx + 1 : '',
            matIdx === 0 ? order.name : '',
            matIdx === 0 && order.created_at ? formatDate(order.created_at) : '',
            m.material_name,
            qty,
            unit,
            rate,
            makingRate > 0 ? makingRate : '',
            purity > 0 ? `${purity}%` : '',
            purity > 0 ? pureMat : '',
            matCost,
            matIdx === 0 ? orderCost : ''
          ]);
        });
      }
    });
  }

  sheetRows.push([]);

  // Section 2: Pure Gold Received Ledger
  sheetRows.push(['PURE GOLD RECEIVED LEDGER']);
  sheetRows.push(['S.No', 'Received Date', 'Pure Gold Quantity (g)', 'Notes / Description']);

  if (goldRecords.length === 0) {
    sheetRows.push(['No gold received records']);
  } else {
    goldRecords.forEach((g, idx) => {
      sheetRows.push([
        idx + 1,
        formatDate(g.received_date),
        Number(g.quantity) || 0,
        g.notes || ''
      ]);
    });
  }

  sheetRows.push(['', 'Total Pure Gold Received (g):', totalGoldReceived]);
  sheetRows.push(['', 'Pure Gold Balance Due (g):', goldBalanceRemaining]);
  sheetRows.push([]);

  // Section 3: Payments & Debits Ledger
  sheetRows.push(['PAYMENTS & TRANSACTIONS LEDGER']);
  sheetRows.push(['S.No', 'Transaction Date', 'Type', 'Amount (₹)', 'Payment Mode / Notes']);

  if (payments.length === 0) {
    sheetRows.push(['No payments recorded']);
  } else {
    payments.forEach((p, idx) => {
      const isDebit = p.payment_type === 'debit';
      sheetRows.push([
        idx + 1,
        formatDate(p.payment_date),
        isDebit ? 'Debit (Paid to Client)' : 'Credit (Received)',
        isDebit ? -Number(p.amount) : Number(p.amount) || 0,
        p.notes || ''
      ]);
    });
  }

  sheetRows.push(['', '', 'Total Received (Credit) (₹):', totalCredit, '']);
  sheetRows.push(['', '', 'Total Paid to Client (Debit) (₹):', totalDebit, '']);
  sheetRows.push(['', '', 'Net Amount Paid (₹):', totalPaid, '']);
  sheetRows.push(['', '', 'Pending Balance Due (₹):', totalPendingBalance, '']);

  // Convert array of arrays to worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 25 }, // Item Name
    { wch: 14 }, // Created On
    { wch: 20 }, // Material Name
    { wch: 12 }, // Quantity
    { wch: 8 },  // Unit
    { wch: 14 }, // Rate
    { wch: 18 }, // Making Rate
    { wch: 12 }, // Purity %
    { wch: 14 }, // Pure Gold
    { wch: 16 }, // Material Total
    { wch: 18 }  // Jewelry Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Client Ledger');

  // Trigger file download
  const sanitizedName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedName}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(wb, filename);
}
