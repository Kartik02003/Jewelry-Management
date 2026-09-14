import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Phone, ChevronRight, Package, Share2 } from 'lucide-react';
import { formatINR, formatQuantity } from '../../lib/calculations/formatters';
import { ClientWithDetails, JewelryWithDetails } from '../../types/models';
import { ClientPayment, ClientGoldReceived } from '../../types/database';
import { jewelryService } from '../../services/jewelryService';
import { paymentsService } from '../../services/paymentsService';
import { goldReceivedService } from '../../services/goldReceivedService';
import { ShareClientLedgerModal } from './ShareClientLedgerModal';

interface ClientCardProps {
  client: ClientWithDetails;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  const navigate = useNavigate();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [jewelryOrders, setJewelryOrders] = useState<JewelryWithDetails[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [goldRecords, setGoldRecords] = useState<ClientGoldReceived[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleOpenShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoadingDetails(true);
      const [orders, clientPayments, clientGold] = await Promise.all([
        jewelryService.getByClientId(client.id),
        paymentsService.getByClientId(client.id),
        goldReceivedService.getByClientId(client.id),
      ]);
      setJewelryOrders(orders);
      setPayments(clientPayments);
      setGoldRecords(clientGold);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Failed to load client details for share', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <>
      <Card
        variant="interactive"
        onClick={() => navigate(`/clients/${client.id}`)}
        className="p-4 transition-all relative"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-slate-900 text-base truncate">{client.name}</h3>
              <button
                type="button"
                onClick={handleOpenShare}
                disabled={loadingDetails}
                className="p-1.5 text-primary-600 hover:text-primary-800 bg-primary-50/70 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                title="Share Client Ledger"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Share</span>
              </button>
            </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mb-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <Package className="w-3.5 h-3.5 text-primary-600" />
              {client.jewelry_orders_count || 0} {client.jewelry_orders_count === 1 ? 'Order' : 'Orders'}
            </span>

            {client.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {client.phone}
              </span>
            )}
          </div>

          {/* Financial summary mini pill */}
          {(client.total_order_value || 0) > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Total</span>
                <span className="font-bold text-slate-800">{formatINR(client.total_order_value)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Paid</span>
                <span className="font-bold text-emerald-600">{formatINR(client.total_paid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Remaining</span>
                <span className={`font-bold ${(client.total_remaining || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {formatINR(client.total_remaining)}
                </span>
              </div>
            </div>
          )}

          {/* Pure Gold summary mini pill */}
          {(client.total_pure_gold || 0) > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] mt-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Pure Gold</span>
                <span className="font-bold text-amber-900">{formatQuantity(client.total_pure_gold, 'g')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Gold Recv</span>
                <span className="font-bold text-amber-700">{formatQuantity(client.total_gold_received, 'g')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Gold Left</span>
                <span className={`font-bold ${(client.total_gold_remaining || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {formatQuantity(client.total_gold_remaining, 'g')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-slate-300 group-hover:text-slate-500 shrink-0 self-center">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </Card>

    {isShareModalOpen && (
      <ShareClientLedgerModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        client={client}
        jewelryOrders={jewelryOrders}
        payments={payments}
        goldRecords={goldRecords}
      />
    )}
  </>
  );
};
