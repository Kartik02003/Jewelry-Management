import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientLedgerData } from './clientLedgerExport';
import { formatDate } from '../calculations/formatters';
import {
  calculateJewelryTotal,
  calculateJewelryMaterialTotal,
  calculateJewelryPureGold,
} from '../calculations/jewelryCalculations';

// Clean currency formatting for PDF (avoiding unicode character issues in standard fonts)
function formatPdfINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0';
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${formatted}`;
}

function formatPdfWeight(qty: number | null | undefined): string {
  if (qty === null || qty === undefined || isNaN(qty)) return '0.00 g';
  return `${Number(qty).toFixed(2)} g`;
}

function formatPdfQuantity(qty: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(qty);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Generates a high-quality, professional PDF document representing the entire client ledger.
 */
export function generateClientLedgerPDF(data: ClientLedgerData): jsPDF {
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
    .filter((p) => p.payment_type !== 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalDebit = payments
    .filter((p) => p.payment_type === 'debit')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaid = totalCredit - totalDebit;
  const totalPendingBalance = Math.max(0, totalOrderValue - totalPaid);

  const totalGoldReceived = goldRecords.reduce((acc, g) => acc + (Number(g.quantity) || 0), 0);
  const goldBalanceRemaining = Math.max(0, totalPureGoldRequired - totalGoldReceived);

  // Initialize jsPDF (A4 Portrait, mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // --- HEADER SECTION ---
  // Top Banner
  const bannerY = 12;
  const bannerHeight = 26;

  // Dark Slate Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, bannerY, contentWidth, bannerHeight, 3, 3, 'F');

  // Gold decorative accent line on left of banner
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(marginX + 2, bannerY + 4, 2.5, bannerHeight - 8, 'F');

  // Brand and Statement Title
  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JEWELRY MANAGEMENT SYSTEM', marginX + 8, bannerY + 9);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CLIENT STATEMENT & LEDGER', marginX + 8, bannerY + 18);

  // Date and Statement Meta on the right side of banner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Statement Date: ${today}`, pageWidth - marginX - 6, bannerY + 10, { align: 'right' });
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - marginX - 6, bannerY + 16, { align: 'right' });
  if (client.phone) {
    doc.text(`Tel: ${client.phone}`, pageWidth - marginX - 6, bannerY + 22, { align: 'right' });
  }

  // --- CLIENT DETAILS BAR ---
  const clientCardY = bannerY + bannerHeight + 5;
  const clientCardHeight = 16;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, clientCardY, contentWidth, clientCardHeight, 2, 2, 'FD');

  // Client Name Icon / Label
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CLIENT NAME', marginX + 5, clientCardY + 6);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(client.name.toUpperCase(), marginX + 5, clientCardY + 12);

  // Status Badges on Right
  const badgeWidth = 48;
  const badgeHeight = 9;
  const badgeX = pageWidth - marginX - badgeWidth - 4;
  const badgeY = clientCardY + 3.5;

  if (totalPendingBalance > 0) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setTextColor(185, 28, 28); // red-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`PENDING: ${formatPdfINR(totalPendingBalance)}`, badgeX + badgeWidth / 2, badgeY + 6, { align: 'center' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ALL PAYMENTS SETTLED ✓', badgeX + badgeWidth / 2, badgeY + 6, { align: 'center' });
  }

  // --- EXECUTIVE SUMMARY CARDS (Financial & Pure Gold) ---
  const summaryY = clientCardY + clientCardHeight + 5;
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 30;

  // 1. Financial Summary Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, summaryY, cardWidth, cardHeight, 2, 2, 'FD');

  // Mini top bar for Financial Card
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(marginX, summaryY, cardWidth, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FINANCIAL STATEMENT OVERVIEW', marginX + 4, summaryY + 4.3);

  // Financial Items
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Orders Value:', marginX + 4, summaryY + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfINR(totalOrderValue), marginX + cardWidth - 4, summaryY + 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Paid (Net):', marginX + 4, summaryY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatPdfINR(totalPaid), marginX + cardWidth - 4, summaryY + 17, { align: 'right' });

  // Divider inside financial card
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX + 4, summaryY + 20, marginX + cardWidth - 4, summaryY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('Pending Balance Due:', marginX + 4, summaryY + 25.5);
  doc.setFontSize(9);
  doc.text(formatPdfINR(totalPendingBalance), marginX + cardWidth - 4, summaryY + 25.5, { align: 'right' });

  // 2. Pure Gold Summary Card
  const goldCardX = marginX + cardWidth + cardGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(goldCardX, summaryY, cardWidth, cardHeight, 2, 2, 'FD');

  // Mini top bar for Gold Card
  doc.setFillColor(180, 83, 9); // amber-700
  doc.roundedRect(goldCardX, summaryY, cardWidth, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PURE GOLD STATEMENT OVERVIEW', goldCardX + 4, summaryY + 4.3);

  // Gold Items
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Pure Gold Required:', goldCardX + 4, summaryY + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfWeight(totalPureGoldRequired), goldCardX + cardWidth - 4, summaryY + 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Pure Gold Received:', goldCardX + 4, summaryY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(formatPdfWeight(totalGoldReceived), goldCardX + cardWidth - 4, summaryY + 17, { align: 'right' });

  // Divider inside gold card
  doc.setDrawColor(226, 232, 240);
  doc.line(goldCardX + 4, summaryY + 20, goldCardX + cardWidth - 4, summaryY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('Gold Balance Due:', goldCardX + 4, summaryY + 25.5);
  doc.setFontSize(9);
  doc.text(formatPdfWeight(goldBalanceRemaining), goldCardX + cardWidth - 4, summaryY + 25.5, { align: 'right' });

  let currentY = summaryY + cardHeight + 8;

  // --- SECTION 1: JEWELRY ORDERS TABLE ---
  const jewelryTableBody: any[][] = [];

  if (jewelryOrders.length === 0) {
    jewelryTableBody.push([
      { content: 'No jewelry orders recorded for this client.', colSpan: 6, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }
    ]);
  } else {
    jewelryOrders.forEach((order, idx) => {
      const mats = order.materials || [];
      const orderCost = calculateJewelryTotal(mats);
      const pureGold = calculateJewelryPureGold(mats);

      // Materials description text
      let materialsDesc = 'No materials listed';
      if (mats.length > 0) {
        materialsDesc = mats
          .map((m) => {
            const qty = Number(m.quantity) || 0;
            const unit = (!m.unit || /^\d+k$/i.test(m.unit.trim())) ? 'g' : m.unit;
            const rate = Number(m.unit_cost) || 0;
            const makingRate = Number(m.making_rate) || 0;
            const purity = Number(m.purity_percentage) || 0;
            const pure = Number(m.pure_quantity) || (purity > 0 ? (qty * purity) / 100 : 0);

            let str = `• ${m.material_name}: ${formatPdfQuantity(qty, unit)} @ ${formatPdfINR(rate)}/${unit}`;
            if (makingRate > 0) {
              str += ` + Making ${formatPdfINR(makingRate)}/${unit}`;
            }
            if (pure > 0) {
              str += ` (Pure: ${pure.toFixed(2)}g)`;
            }
            return str;
          })
          .join('\n');
      }

      const itemTitle = order.description
        ? `${order.name.toUpperCase()}\nNote: ${order.description}`
        : order.name.toUpperCase();

      jewelryTableBody.push([
        String(idx + 1),
        itemTitle,
        order.created_at ? formatDate(order.created_at) : '—',
        materialsDesc,
        pureGold > 0 ? formatPdfWeight(pureGold) : '—',
        formatPdfINR(orderCost),
      ]);
    });
  }

  // Section 1 Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. JEWELRY ORDERS (${jewelryOrders.length} Items)`, marginX, currentY - 2);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item Name & Notes', 'Date', 'Materials Breakdown & Rates', 'Pure Gold', 'Total Amount']],
    body: jewelryTableBody,
    foot: jewelryOrders.length > 0 ? [
      [
        { content: 'TOTALS', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatPdfWeight(totalPureGoldRequired), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatPdfINR(totalOrderValue), styles: { fontStyle: 'bold', halign: 'right', textColor: [15, 23, 42] } },
      ]
    ] : undefined,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 20 },
      3: { cellWidth: 62 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- CHECK PAGE BREAK BEFORE SECTION 2 & 3 ---
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  // --- SECTION 2: PURE GOLD RECEIVED LEDGER ---
  const goldTableBody: any[][] = [];
  if (goldRecords.length === 0) {
    goldTableBody.push([
      { content: 'No pure gold deposits recorded.', colSpan: 4, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }
    ]);
  } else {
    goldRecords.forEach((g, idx) => {
      goldTableBody.push([
        String(idx + 1),
        formatDate(g.received_date),
        formatPdfWeight(g.quantity),
        g.notes || '—',
      ]);
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. PURE GOLD RECEIVED STATEMENT (${goldRecords.length} Entries)`, marginX, currentY - 2);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Received Date', 'Gold Quantity (g)', 'Notes / Reference']],
    body: goldTableBody,
    foot: [
      [
        { content: 'Total Pure Gold Received:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatPdfWeight(totalGoldReceived), styles: { fontStyle: 'bold', halign: 'right', textColor: [180, 83, 9] } },
        { content: `Balance Due: ${formatPdfWeight(goldBalanceRemaining)}`, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
      ]
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [180, 83, 9], // amber-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 104 },
    },
    footStyles: {
      fillColor: [254, 243, 199], // amber-100
      textColor: [146, 64, 14],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [255, 251, 235],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- CHECK PAGE BREAK BEFORE SECTION 3 ---
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  // --- SECTION 3: PAYMENTS & FINANCIAL TRANSACTIONS TABLE ---
  const paymentTableBody: any[][] = [];
  if (payments.length === 0) {
    paymentTableBody.push([
      { content: 'No payment transactions recorded.', colSpan: 5, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }
    ]);
  } else {
    payments.forEach((p, idx) => {
      const isDebit = p.payment_type === 'debit';
      paymentTableBody.push([
        String(idx + 1),
        formatDate(p.payment_date),
        isDebit ? 'Debit (Paid to Client)' : 'Credit (Received from Client)',
        p.notes || '—',
        {
          content: `${isDebit ? '-' : '+'}${formatPdfINR(p.amount)}`,
          styles: {
            textColor: isDebit ? [220, 38, 38] : [5, 150, 105],
            fontStyle: 'bold',
            halign: 'right',
          },
        },
      ]);
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. PAYMENTS & TRANSACTIONS HISTORY (${payments.length} Entries)`, marginX, currentY - 2);

  const paymentFoot: any[][] = [
    [
      { content: 'Total Received (Credit):', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatPdfINR(totalCredit), styles: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } },
    ],
  ];

  if (totalDebit > 0) {
    paymentFoot.push([
      { content: 'Total Paid to Client (Debit):', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `-${formatPdfINR(totalDebit)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
    ]);
  }

  paymentFoot.push(
    [
      { content: 'Net Paid Amount:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatPdfINR(totalPaid), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
    [
      { content: 'NET PENDING BALANCE DUE:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] } },
      { content: formatPdfINR(totalPendingBalance), styles: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] } },
    ]
  );

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Transaction Date', 'Type', 'Notes / Mode', 'Amount']],
    body: paymentTableBody,
    foot: paymentFoot,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 46 },
      3: { cellWidth: 68 },
      4: { cellWidth: 34, halign: 'right' },
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // --- FOOTER & PAGE NUMBERING ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle divider above footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Footer Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Confidential • Client Statement for ${client.name} • Jewelry Management`, marginX, pageHeight - 6.5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

/**
 * Generates and downloads the client ledger PDF file.
 */
export function downloadClientLedgerPDF(data: ClientLedgerData): void {
  const doc = generateClientLedgerPDF(data);
  const sanitizedName = data.client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedName}_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Shares the PDF using Web Share API if supported by the browser/device (e.g. mobile WhatsApp/Files),
 * or falls back to direct PDF download.
 */
export async function shareOrDownloadClientLedgerPDF(data: ClientLedgerData): Promise<{ shared: boolean; downloaded: boolean }> {
  const doc = generateClientLedgerPDF(data);
  const sanitizedName = data.client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedName}_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: `${data.client.name} - Statement`,
        text: `Client Statement & Ledger for ${data.client.name}`,
      });
      return { shared: true, downloaded: false };
    }
  } catch (shareErr: any) {
    // If user cancelled the share modal, don't download
    if (shareErr.name === 'AbortError') {
      return { shared: false, downloaded: false };
    }
    console.warn('Web Share failed or unsupported, falling back to download', shareErr);
  }

  // Fallback: download directly
  doc.save(filename);
  return { shared: false, downloaded: true };
}
