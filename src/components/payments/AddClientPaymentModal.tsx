import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { formatINR, getTodayDateString } from '../../lib/calculations/formatters';
import { paymentsService } from '../../services/paymentsService';

interface AddClientPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  remainingAmount?: number;
  onPaymentAdded: () => void;
}

export const AddClientPaymentModal: React.FC<AddClientPaymentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  remainingAmount = 0,
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
      await paymentsService.addClientPayment({
        client_id: clientId,
        amount: numAmount,
        payment_date: paymentDate,
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
      title="Record Client Payment"
      description={`For Client: ${clientName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Remaining amount badge if > 0 */}
        {remainingAmount > 0 && (
          <div className="p-3.5 bg-primary-50/70 border border-primary-100 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-900">Remaining Balance</span>
            <span className="text-base font-extrabold text-primary-700">{formatINR(remainingAmount)}</span>
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
          />

          {/* Quick Fill Buttons */}
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
              className="text-xs px-2.5 py-1 bg-primary-100 hover:bg-primary-200 text-primary-800 rounded-lg font-medium transition-colors"
            >
              Full ({formatINR(remainingAmount)})
            </button>
          </div>
        </div>

        <Input
          label="Payment Date"
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder="e.g. Received via UPI / Cash / Cheque"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-2">
          <Button type="submit" isLoading={loading} className="w-full" size="lg">
            Save Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
