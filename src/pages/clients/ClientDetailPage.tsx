import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { JewelryCard } from '../../components/jewelry/JewelryCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ClientWithDetails, JewelryWithDetails } from '../../types/models';
import { ClientPayment, ClientGoldReceived } from '../../types/database';
import { clientsService } from '../../services/clientsService';
import { jewelryService } from '../../services/jewelryService';
import { paymentsService } from '../../services/paymentsService';
import { goldReceivedService } from '../../services/goldReceivedService';
import { formatINR, formatDate, formatQuantity } from '../../lib/calculations/formatters';
import {
  calculateJewelryPureGold,
  calculateClientTotalGoldReceived,
  calculateClientGoldRemaining
} from '../../lib/calculations/jewelryCalculations';
import { AddClientPaymentModal } from '../../components/payments/AddClientPaymentModal';
import { AddClientGoldModal } from '../../components/payments/AddClientGoldModal';
import { ShareClientLedgerModal } from '../../components/clients/ShareClientLedgerModal';
import {
  Plus,
  Phone,
  FileText,
  Edit,
  Trash2,
  Gem,
  Loader2,
  CreditCard,
  Calendar,
  Scale,
  Share2
} from 'lucide-react';

export const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientWithDetails | null>(null);
  const [jewelryOrders, setJewelryOrders] = useState<JewelryWithDetails[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [goldRecords, setGoldRecords] = useState<ClientGoldReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const [isGoldModalOpen, setIsGoldModalOpen] = useState(false);
  const [deleteGoldId, setDeleteGoldId] = useState<string | null>(null);

  const loadData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const [c, orders, clientPayments, clientGold] = await Promise.all([
        clientsService.getById(clientId),
        jewelryService.getByClientId(clientId),
        paymentsService.getByClientId(clientId),
        goldReceivedService.getByClientId(clientId),
      ]);
      setClient(c);
      setJewelryOrders(orders);
      setPayments(clientPayments);
      setGoldRecords(clientGold);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleDeleteClient = async () => {
    if (!clientId) return;
    setIsDeleting(true);
    try {
      await clientsService.delete(clientId);
      navigate('/clients');
    } catch (err) {
      console.error('Failed to delete client', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await paymentsService.deleteClientPayment(paymentId);
      loadData();
    } catch (err) {
      console.error('Failed to delete payment', err);
    } finally {
      setDeletePaymentId(null);
    }
  };

  const handleDeleteGold = async (goldId: string) => {
    try {
      await goldReceivedService.delete(goldId);
      loadData();
    } catch (err) {
      console.error('Failed to delete gold record', err);
    } finally {
      setDeleteGoldId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="text-xs font-medium">Loading client details...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">Client not found.</p>
        <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  // Financial calculations
  const totalOrderValue = jewelryOrders.reduce((acc, j) => acc + j.total_material_cost, 0);
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalRemaining = Math.max(0, totalOrderValue - totalPaid);

  // Pure Gold calculations
  const totalPureGold = jewelryOrders.reduce((acc, j) => acc + calculateJewelryPureGold(j.materials || []), 0);
  const totalGoldReceived = calculateClientTotalGoldReceived(goldRecords);
  const totalGoldRemaining = calculateClientGoldRemaining(totalPureGold, totalGoldReceived);

  return (
    <div className="space-y-4">
      <Header
        title={client.name}
        subtitle="Client Overview"
        showBack
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 py-1.5 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs border border-primary-200/60"
              title="Share Complete Client Ledger"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={() => navigate(`/clients/${client.id}/edit`)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Edit Client"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete Client"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 space-y-4">
        {/* Client Info Card */}
        <Card className="p-4 space-y-2.5">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-primary-700 transition-colors font-medium"
            >
              <Phone className="w-4 h-4 text-primary-600" />
              <span>{client.phone}</span>
            </a>
          )}

          {client.notes && (
            <div className="flex items-start gap-2.5 text-xs text-slate-500 pt-1 border-t border-slate-100 italic">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{client.notes}</span>
            </div>
          )}
        </Card>

        {/* 1. Client Financial Summary Card */}
        {(jewelryOrders.length > 0 || payments.length > 0) && (
          <Card className="p-4 bg-slate-900 text-white border-none shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Payment Summary
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Payment</span>
                <span className="text-base font-extrabold text-white">{formatINR(totalOrderValue)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Received</span>
                <span className="text-base font-extrabold text-emerald-400">{formatINR(totalPaid)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pending Payment</span>
                <span className={`text-base font-extrabold ${totalRemaining > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatINR(totalRemaining)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* 2. Client Pure Gold Summary Card (just below the payments card) */}
        {(totalPureGold > 0 || goldRecords.length > 0) && (
          <Card className="p-4 bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 text-amber-50 border-none shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-3 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-300" />
              <span>Pure Gold Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-left">
                <span className="text-[10px] text-amber-300/70 uppercase font-semibold block">Total Pure Gold</span>
                <span className="text-base font-extrabold text-white">{formatQuantity(totalPureGold, 'g')}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-300/70 uppercase font-semibold block">Quantity Received</span>
                <span className="text-base font-extrabold text-amber-300">{formatQuantity(totalGoldReceived, 'g')}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-300/70 uppercase font-semibold block">Quantity Left</span>
                <span className={`text-base font-extrabold ${totalGoldRemaining > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatQuantity(totalGoldRemaining, 'g')}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Jewelry Orders Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Jewelry Orders ({jewelryOrders.length})
            </h2>
            <Button
              size="sm"
              onClick={() => navigate(`/clients/${client.id}/jewelry/new`)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Jewelry
            </Button>
          </div>

          {jewelryOrders.length === 0 ? (
            <EmptyState
              icon={<Gem className="w-6 h-6" />}
              title="No jewelry orders yet"
              description="Create a jewelry order to track materials and calculate total cost."
              actionText="+ Add First Jewelry"
              onAction={() => navigate(`/clients/${client.id}/jewelry/new`)}
            />
          ) : (
            <div className="space-y-3">
              {jewelryOrders.map((j) => (
                <JewelryCard key={j.id} jewelry={j} />
              ))}
            </div>
          )}
        </div>

        {/* Client Payments Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Client Payments ({payments.length})</span>
            </h2>
            <Button
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Payment
            </Button>
          </div>

          {payments.length === 0 ? (
            <Card className="p-5 text-center bg-slate-50 border-dashed">
              <p className="text-xs text-slate-500 mb-3">No payments recorded yet for this client.</p>
              <Button
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Record First Payment
              </Button>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden divide-y divide-slate-100">
              {payments.map((payment) => (
                <div key={payment.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(payment.payment_date)}</span>
                    </div>
                    {payment.notes && (
                      <p className="text-slate-500 italic text-[11px]">{payment.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-emerald-600 text-base">
                      {formatINR(payment.amount)}
                    </span>
                    <button
                      onClick={() => setDeletePaymentId(payment.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-3.5 bg-emerald-50/60 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-900">Total Paid</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatINR(totalPaid)}
                </span>
              </div>
            </Card>
          )}
        </div>

        {/* Pure Gold Received Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Pure Gold Received ({goldRecords.length})</span>
            </h2>
            <Button
              size="sm"
              onClick={() => setIsGoldModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Received Pure Gold
            </Button>
          </div>

          {goldRecords.length === 0 ? (
            <Card className="p-5 text-center bg-slate-50 border-dashed">
              <p className="text-xs text-slate-500 mb-3">No pure gold received yet from this client.</p>
              <Button
                size="sm"
                onClick={() => setIsGoldModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Record Gold Received
              </Button>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden divide-y divide-slate-100">
              {goldRecords.map((record) => (
                <div key={record.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(record.received_date)}</span>
                    </div>
                    {record.notes && (
                      <p className="text-slate-500 italic text-[11px]">{record.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-amber-700 text-base">
                      {formatQuantity(record.quantity, 'g')}
                    </span>
                    <button
                      onClick={() => setDeleteGoldId(record.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-3.5 bg-amber-50/80 flex items-center justify-between text-xs font-bold">
                <span className="text-amber-900">Total Pure Gold Received</span>
                <span className="text-base font-extrabold text-amber-800">
                  {formatQuantity(totalGoldReceived, 'g')}
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Client Payment Modal */}
      <AddClientPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        clientId={client.id}
        clientName={client.name}
        remainingAmount={totalRemaining}
        onPaymentAdded={loadData}
      />

      {/* Add Client Pure Gold Modal */}
      <AddClientGoldModal
        isOpen={isGoldModalOpen}
        onClose={() => setIsGoldModalOpen(false)}
        clientId={client.id}
        clientName={client.name}
        remainingPureGold={totalGoldRemaining}
        onGoldAdded={loadData}
      />

      {/* Share Client Ledger Modal */}
      {client && (
        <ShareClientLedgerModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          client={client}
          jewelryOrders={jewelryOrders}
          payments={payments}
          goldRecords={goldRecords}
        />
      )}

      {/* Delete Client Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client?"
        message={`Are you sure you want to delete ${client.name}? All ${jewelryOrders.length} associated jewelry orders, payment records, and gold records will also be permanently deleted.`}
        confirmText="Yes, Delete Client"
        isLoading={isDeleting}
      />

      {/* Delete Payment Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletePaymentId)}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() => {
          if (deletePaymentId) handleDeletePayment(deletePaymentId);
        }}
        title="Delete Payment Record?"
        message="Are you sure you want to delete this payment record? The client remaining balance will be updated accordingly."
        confirmText="Yes, Delete Payment"
      />

      {/* Delete Gold Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteGoldId)}
        onClose={() => setDeleteGoldId(null)}
        onConfirm={() => {
          if (deleteGoldId) handleDeleteGold(deleteGoldId);
        }}
        title="Delete Gold Record?"
        message="Are you sure you want to delete this received gold record? The client remaining gold balance will be updated accordingly."
        confirmText="Yes, Delete Record"
      />
    </div>
  );
};

