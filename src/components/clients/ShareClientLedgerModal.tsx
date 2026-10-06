import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClientWithDetails, JewelryWithDetails } from '../../types/models';
import { ClientPayment, ClientGoldReceived } from '../../types/database';
import {
  exportClientLedgerToExcel,
  downloadClientLedgerPDF,
  shareOrDownloadClientLedgerPDF,
  ClientLedgerData
} from '../../lib/export/clientLedgerExport';
import {
  FileDown,
  FileSpreadsheet,
  Share2,
  Phone,
  User,
  Calendar,
  Check,
  Scale,
  CreditCard,
  Package,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate } from '../../lib/calculations/formatters';
import {
  calculateJewelryTotal,
  calculateJewelryPureGold
} from '../../lib/calculations/jewelryCalculations';

interface ShareClientLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientWithDetails;
  jewelryOrders: JewelryWithDetails[];
  payments: ClientPayment[];
  goldRecords: ClientGoldReceived[];
}

export const ShareClientLedgerModal: React.FC<ShareClientLedgerModalProps> = ({
  isOpen,
  onClose,
  client,
  jewelryOrders,
  payments,
  goldRecords,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);

  const ledgerData: ClientLedgerData = {
    client,
    jewelryOrders,
    payments,
    goldRecords,
  };

  // Check if browser supports Web Share API with files
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
      try {
        const dummyFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        if (navigator.canShare({ files: [dummyFile] })) {
          setCanShareFile(true);
        }
      } catch {
        setCanShareFile(false);
      }
    }
  }, []);

  // Calculate totals for preview and share
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

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      // Small timeout to allow UI state update for smooth feel
      await new Promise((r) => setTimeout(r, 100));
      downloadClientLedgerPDF(ledgerData);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setSharingPdf(true);
      await new Promise((r) => setTimeout(r, 100));
      const res = await shareOrDownloadClientLedgerPDF(ledgerData);
      if (res.downloaded) {
        setPdfDownloaded(true);
        setTimeout(() => setPdfDownloaded(false), 3000);
      }
    } catch (err) {
      console.error('Failed to share PDF', err);
    } finally {
      setSharingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      exportClientLedgerToExcel(ledgerData);
    } catch (err) {
      console.error('Failed to export excel', err);
    }
  };

  const handleShareWhatsApp = () => {
    const today = formatDate(new Date().toISOString());
    const text = [
      `*CLIENT STATEMENT & LEDGER*`,
      `*Client:* ${client.name}`,
      client.phone ? `*Phone:* ${client.phone}` : null,
      `*Date:* ${today}`,
      `---------------------------------`,
      `*FINANCIAL SUMMARY:*`,
      `• Total Orders Value: ${formatINR(totalOrderValue)}`,
      `• Total Paid: ${formatINR(totalPaid)}`,
      `• *Pending Balance Due: ${formatINR(totalPendingBalance)}*`,
      `---------------------------------`,
      `*PURE GOLD SUMMARY:*`,
      `• Gold Required: ${totalPureGoldRequired.toFixed(2)} g`,
      `• Gold Received: ${totalGoldReceived.toFixed(2)} g`,
      `• *Gold Balance Due: ${goldBalanceRemaining.toFixed(2)} g*`,
      `---------------------------------`,
      `_Detailed PDF statement is available on request._`
    ]
      .filter(Boolean)
      .join('\n');

    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Client Ledger"
      description={`Formatted statement & ledger for ${client.name}`}
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Client Info Header Badge */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <User className="w-3.5 h-3.5 text-primary-600" />
            <span>{client.name}</span>
          </div>

          {client.phone && (
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{client.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
        </div>

        {/* Primary Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: PDF Statement (Replaced Copy Formatted Text) */}
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            icon={
              downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
              ) : pdfDownloaded ? (
                <Check className="w-4 h-4 text-white shrink-0" />
              ) : (
                <FileDown className="w-4 h-4 text-white shrink-0" />
              )
            }
            className={`w-full text-xs py-2.5 whitespace-nowrap font-bold shadow-sm transition-all ${pdfDownloaded
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
              }`}
          >
            {downloadingPdf
              ? 'Generating PDF...'
              : pdfDownloaded
                ? 'PDF Downloaded! ✓'
                : 'Download PDF'}
          </Button>

          {/* Option 2: Download Formatted Excel */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
            className="w-full text-xs py-2.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 whitespace-nowrap font-bold"
          >
            Download Excel (.xlsx)
          </Button>
        </div>

        {/* Option 3: Mobile Native Share or WhatsApp share */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {canShareFile ? (
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={sharingPdf}
              className="w-full py-2 px-3 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {sharingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600 shrink-0" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <span>Share PDF file directly</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Save PDF Statement</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Share Summary on WhatsApp</span>
          </button>
        </div>

        {/* Document Preview Card (Mirrors PDF layout) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Statement Document Preview
            </span>
            <span>
              {jewelryOrders.length} Items • {payments.length} Payments • {goldRecords.length} Gold
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-inner space-y-3">
            {/* Document Header in Preview */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <p className="text-[10px] tracking-wider font-semibold text-amber-400 uppercase">Jewelry Management</p>
                <h4 className="text-sm font-bold text-white">Client Statement & Ledger</h4>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${totalPendingBalance > 0
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                  {totalPendingBalance > 0 ? `Pending: ${formatINR(totalPendingBalance)}` : 'Settled ✓'}
                </span>
              </div>
            </div>

            {/* Financial & Gold Overview Cards in Preview */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase mb-1">
                  <CreditCard className="w-3 h-3 text-emerald-400" />
                  Financial Summary
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Orders:</span>
                    <span className="font-semibold text-white">{formatINR(totalOrderValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Paid:</span>
                    <span className="font-semibold text-emerald-400">{formatINR(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700/60 font-bold">
                    <span className="text-rose-300">Balance Due:</span>
                    <span className="text-rose-400">{formatINR(totalPendingBalance)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase mb-1">
                  <Scale className="w-3 h-3 text-amber-400" />
                  Pure Gold Summary
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Required:</span>
                    <span className="font-semibold text-white">{totalPureGoldRequired.toFixed(2)} g</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Received:</span>
                    <span className="font-semibold text-amber-400">{totalGoldReceived.toFixed(2)} g</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700/60 font-bold">
                    <span className="text-amber-300">Gold Due:</span>
                    <span className="text-amber-400">{goldBalanceRemaining.toFixed(2)} g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Summary Snippet */}
            <div className="bg-slate-800/40 p-2 rounded-xl text-[11px] space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                <Package className="w-3 h-3 text-primary-400" />
                Orders Included ({jewelryOrders.length})
              </div>
              {jewelryOrders.length === 0 ? (
                <p className="text-slate-400 italic text-[10px]">No orders recorded</p>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {jewelryOrders.map((order, i) => (
                    <div key={order.id || i} className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-800/60 last:border-0">
                      <span className="truncate pr-2">{i + 1}. {order.name}</span>
                      <span className="font-semibold text-slate-100 shrink-0">
                        {formatINR(calculateJewelryTotal(order.materials || []))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Close Button */}
        {/* <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs"
          >
            Close
          </Button>
        </div> */}
      </div>
    </Modal>
  );
};
