import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AddCraftsmanPaymentModal } from '../../components/payments/AddCraftsmanPaymentModal';
import { AddCraftsmanItemReceivedModal } from '../../components/craftsmen/AddCraftsmanItemReceivedModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CraftsmanTransactionWithDetails, CraftsmanItemWithPayments } from '../../types/models';
import { transactionsService } from '../../services/transactionsService';
import { paymentsService } from '../../services/paymentsService';
import { formatINR, formatDate, formatQuantity } from '../../lib/calculations/formatters';
import { 
  Hammer, 
  Calendar, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  Edit, 
  CreditCard, 
  Loader2 
} from 'lucide-react';

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<CraftsmanTransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Item Received modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Payment modal state
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<CraftsmanItemWithPayments | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!transactionId) return;
    try {
      setLoading(true);
      const data = await transactionsService.getById(transactionId);
      setTransaction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const handleDeleteTransaction = async () => {
    if (!transactionId) return;
    setIsDeleting(true);
    try {
      await transactionsService.delete(transactionId);
      if (transaction?.craftsman_id) {
        navigate(`/craftsmen/${transaction.craftsman_id}`);
      } else {
        navigate('/craftsmen');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await paymentsService.deleteCraftsmanPayment(paymentId);
      setDeletePaymentId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="text-xs font-medium">Loading transaction details...</span>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">Transaction not found.</p>
        <Button onClick={() => navigate('/craftsmen')}>Back to Craftsmen</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={transaction.craftsman ? transaction.craftsman.name : 'Transaction'}
        subtitle={`Recorded on ${formatDate(transaction.transaction_date)}`}
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/craftsman-transactions/${transaction.id}/edit`)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Edit Transaction"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete Transaction"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 space-y-4">
        {/* 1. TRANSACTION PURE GOLD & FINANCIAL SUMMARY */}
        <div className="space-y-3">
          {/* Pure Gold Summary */}
          <Card className="p-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white border-none shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200 mb-3 flex items-center justify-between">
              <span>Pure Gold Status (Gold Only)</span>
              <span className="text-[10px] bg-amber-800/60 px-2 py-0.5 rounded-full font-semibold">24K Pure</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-left">
                <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Given</span>
                <span className="text-base font-extrabold text-white">
                  {(transaction.total_pure_gold_given || 0).toFixed(2)} g
                </span>
              </div>
              <div>
                <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Received</span>
                <span className="text-base font-extrabold text-amber-100">
                  {(transaction.total_pure_gold_received || transaction.total_pure_material || 0).toFixed(2)} g
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Left</span>
                <span
                  className={`text-base font-extrabold ${
                    (transaction.total_pure_gold_remaining || 0) > 0 ? 'text-amber-200' : 'text-emerald-300'
                  }`}
                >
                  {(transaction.total_pure_gold_remaining || 0).toFixed(2)} g
                </span>
              </div>
            </div>
          </Card>

          {/* Financial Summary */}
          <Card className="p-4 bg-slate-900 text-white border-none shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Cost & Payment Summary
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
                <span className="text-base font-extrabold text-white">
                  {formatINR(transaction.total_making_cost)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Paid</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatINR(transaction.total_paid)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining</span>
                <span
                  className={`text-base font-extrabold ${
                    transaction.remaining_making_cost > 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {formatINR(transaction.remaining_making_cost)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. PURE GOLD GIVEN */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <span>Pure Gold Given ({transaction.materials_given.length})</span>
          </h3>

          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            {transaction.materials_given.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 italic">No gold given recorded</div>
            ) : (
              transaction.materials_given.map((g) => (
                <div key={g.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {g.material_name}
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Given on: {formatDate(transaction.transaction_date)}
                    </span>
                  </div>
                  <span className="font-extrabold text-amber-800 text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60">
                    {formatQuantity(g.quantity, 'g')} Pure Gold
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* 3. ITEMS RECEIVED (WITH ITEM-LEVEL DETAILS & PAYMENTS) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-amber-600" />
              <span>Items Received ({transaction.items_received.length})</span>
            </h3>
            <Button
              size="sm"
              onClick={() => setShowAddItemModal(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {transaction.items_received.map((item) => (
              <Card key={item.id} className="p-4 space-y-3 border-slate-200/80">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{item.item_name}</h4>
                    {item.received_date && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Received: {formatDate(item.received_date)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 block">
                      Cost: {formatINR(item.making_cost)}
                    </span>
                    {item.cost_per_gram && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        @{formatINR(item.cost_per_gram)}/g
                      </span>
                    )}
                  </div>
                </div>

                {/* Weight, Carat & Pure Gold Metrics */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Weight
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatQuantity(item.gross_quantity, 'g')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Carat</span>
                    <span className="font-bold text-amber-700">{item.carat ? `${item.carat}K` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Purity</span>
                    <span className="font-bold text-slate-800">{item.purity_percentage}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-700 uppercase font-bold block">
                      Pure Gold
                    </span>
                    <span className="font-black text-amber-900">
                      {formatQuantity(item.pure_quantity, 'g')}
                    </span>
                  </div>
                </div>

                </Card>
              ))}
            </div>
          </div>

          {/* 4. PAYMENTS SECTION */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payments ({(transaction.payments || []).length})</span>
              </h3>
              <Button
                size="sm"
                onClick={() => setSelectedItemForPayment({} as any)}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Add Payment
              </Button>
            </div>

            <Card className="p-0 overflow-hidden divide-y divide-slate-100">
              {(transaction.payments || []).length === 0 ? (
                <div className="p-4 text-xs text-slate-400 italic text-center">
                  No payments recorded for this transaction yet.
                </div>
              ) : (
                (transaction.payments || []).map((p) => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">
                        {formatINR(p.amount)}
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Paid on: {formatDate(p.payment_date)} {p.notes ? `• ${p.notes}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletePaymentId(p.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>

        {/* Add Item Received Modal */}
        <AddCraftsmanItemReceivedModal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          transactionId={transaction.id}
          onItemAdded={loadData}
        />

        {/* Payment Modal */}
        {selectedItemForPayment && transaction.craftsman && (
          <AddCraftsmanPaymentModal
            isOpen={Boolean(selectedItemForPayment)}
            onClose={() => setSelectedItemForPayment(null)}
            craftsmanId={transaction.craftsman_id}
            craftsmanName={transaction.craftsman.name}
            remainingAmount={transaction.remaining_making_cost}
            transactionId={transaction.id}
            onPaymentAdded={loadData}
          />
        )}

      {/* Delete Transaction Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction?"
        message="Are you sure you want to delete this craftsman transaction? All material records, returned items, and making payments for this transaction will be permanently removed."
        confirmText="Yes, Delete Transaction"
        isLoading={isDeleting}
      />

      {/* Delete Payment Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletePaymentId)}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() => {
          if (deletePaymentId) handleDeletePayment(deletePaymentId);
        }}
        title="Delete Making Payment?"
        message="Are you sure you want to delete this making charge payment? The remaining making balance will be restored."
        confirmText="Yes, Delete"
      />
    </div>
  );
};
