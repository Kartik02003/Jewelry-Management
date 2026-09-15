import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { formatINR, getTodayDateString } from '../../lib/calculations/formatters';
import { paymentsService } from '../../services/paymentsService';
import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';

interface AddClientPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  remainingAmount?: number;
  initialType?: 'credit' | 'debit';
  onPaymentAdded: () => void;
}

export const AddClientPaymentModal: React.FC<AddClientPaymentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  remainingAmount = 0,
  initialType = 'credit',
  onPaymentAdded,
}) => {
  const [paymentType, setPaymentType] = useState<'credit' | 'debit'>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentType(initialType);
      setAmount('');
      setNotes('');
      setError(null);
      setPaymentDate(getTodayDateString());
    }
  }, [isOpen, initialType]);

  const handleQuickFill = (percentage: number) => {
    if (remainingAmount <= 0) return;
    const val = Math.round(remainingAmount * (percentage / 100));
    setAmount(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await paymentsService.addClientPayment({
        client_id: clientId,
        amount: numAmount,
        payment_date: paymentDate,
        payment_type: paymentType,
        notes: notes || undefined,
      });
      setAmount('');
      setNotes('');
      onPaymentAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentType === 'debit' ? 'Record Debit (Paid to Client)' : 'Record Client Payment (Credit)'}
      description={`For Client: ${clientName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setPaymentType('credit')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${paymentType === 'credit'
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Credit (Received)</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('debit')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${paymentType === 'debit'
              ? 'bg-white text-rose-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Debit (Paid to Client)</span>
          </button>
        </div>

        {/* Informational badge */}
        {paymentType === 'credit' && remainingAmount > 0 && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">Remaining Balance</span>
            <span className="text-base font-extrabold text-emerald-700">{formatINR(remainingAmount)}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div>
          <Input
            label={paymentType === 'debit' ? 'Debit Amount (Paid to Client)' : 'Payment Amount (Received)'}
            type="number"
            step="any"
            required
            placeholder="0"
            prefixIcon={<span className="font-bold text-slate-500">₹</span>}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            autoFocus
          />

          {/* Quick Fill Buttons for Credit */}
          {paymentType === 'credit' && remainingAmount > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickFill(50)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                50% ({formatINR(remainingAmount * 0.5)})
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill(100)}
                className="text-xs px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-medium transition-colors"
              >
                Full ({formatINR(remainingAmount)})
              </button>
            </div>
          )}
        </div>

        <Input
          label="Date"
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder={
            paymentType === 'debit'
              ? 'e.g. Cash refund, old gold buyout payout, excess return...'
              : 'e.g. Received via UPI / Cash / Cheque / Advance...'
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={loading}
            className={`w-full ${paymentType === 'debit'
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            size="lg"
            icon={paymentType === 'debit' ? <ArrowUpRight className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
          >
            {paymentType === 'debit' ? 'Add Debit' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

