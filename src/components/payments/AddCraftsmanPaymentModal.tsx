import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatINR, getTodayDateString } from '../../lib/calculations/formatters';
import { paymentsService } from '../../services/paymentsService';
import { CreditCard } from 'lucide-react';

interface AddCraftsmanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  craftsmanId: string;
  craftsmanName: string;
  remainingAmount?: number;
  transactionId?: string;
  onPaymentAdded: () => void;
}

export const AddCraftsmanPaymentModal: React.FC<AddCraftsmanPaymentModalProps> = ({
  isOpen,
  onClose,
  craftsmanId,
  craftsmanName,
  remainingAmount = 0,
  transactionId,
  onPaymentAdded,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickFill = (percentage: number) => {
    if (remainingAmount <= 0) return;
    const val = Math.round(remainingAmount * (percentage / 100));
    setAmount(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await paymentsService.addCraftsmanPayment({
        craftsman_id: craftsmanId,
        transaction_id: transactionId,
        amount: numAmount,
        payment_date: paymentDate,
        notes: notes || undefined,
      });
      setAmount('');
      setNotes('');
      onPaymentAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record craftsman payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Making Charges Payment"
      description={`For Craftsman: ${craftsmanName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Remaining making cost badge */}
        {remainingAmount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Remaining Making Cost</span>
            <span className="text-base font-extrabold text-amber-700">{formatINR(remainingAmount)}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Payment Amount"
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

          {/* Quick Fill Buttons */}
          {remainingAmount > 0 && (
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
                className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold transition-colors"
              >
                Full ({formatINR(remainingAmount)})
              </button>
            </div>
          )}
        </div>

        <Input
          label="Payment Date"
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Cash, UPI, Bank transfer, Cheque..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={loading}
            icon={<CreditCard className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
