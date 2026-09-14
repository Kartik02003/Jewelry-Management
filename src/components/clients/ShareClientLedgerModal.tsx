import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClientWithDetails, JewelryWithDetails } from '../../types/models';
import { ClientPayment, ClientGoldReceived } from '../../types/database';
import {
  generateClientLedgerText,
  exportClientLedgerToExcel,
  ClientLedgerData
} from '../../lib/export/clientLedgerExport';
import { 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Share2, 
  Phone, 
  User, 
  Calendar 
} from 'lucide-react';
import { formatDate } from '../../lib/calculations/formatters';

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
  const [copied, setCopied] = useState(false);

  const ledgerData: ClientLedgerData = {
    client,
    jewelryOrders,
    payments,
    goldRecords,
  };

  const formattedText = generateClientLedgerText(ledgerData);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
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
    const encoded = encodeURIComponent(formattedText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Client Ledger"
      description={`Complete statement for ${client.name}`}
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

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Copy to Clipboard */}
          <Button
            type="button"
            onClick={handleCopyText}
            className={`w-full text-xs py-2.5 flex items-center justify-center gap-2 ${
              copied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied to Clipboard! ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Formatted Text</span>
              </>
            )}
          </Button>

          {/* Option 2: Download Formatted Excel */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadExcel}
            className="w-full text-xs py-2.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-2 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download Formatted Excel (.xlsx)</span>
          </Button>
        </div>

        {/* Option 3: WhatsApp Share Pill */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Share directly on WhatsApp</span>
        </button>

        {/* Live Formatted Text Preview */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase px-0.5">
            <span>Ledger Preview ({jewelryOrders.length} Jewelry Items)</span>
            <span>{payments.length} Payments • {goldRecords.length} Gold Entries</span>
          </div>

          <pre className="p-3 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 whitespace-pre shadow-inner">
            {formattedText}
          </pre>
        </div>

        {/* Footer Close Button */}
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
