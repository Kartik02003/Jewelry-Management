import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { formatQuantity, getTodayDateString } from '../../lib/calculations/formatters';
import { goldReceivedService } from '../../services/goldReceivedService';

interface AddClientGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  remainingPureGold?: number;
  onGoldAdded: () => void;
}

export const AddClientGoldModal: React.FC<AddClientGoldModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  remainingPureGold = 0,
  onGoldAdded,
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickFill = (percentage: number) => {
    if (remainingPureGold <= 0) return;
    const val = Math.round((remainingPureGold * (percentage / 100)) * 1000) / 1000;
    setQuantity(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      setError('Please enter a valid gold quantity.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await goldReceivedService.add({
        client_id: clientId,
        quantity: numQty,
        received_date: receivedDate,
        notes: notes || undefined,
      });
      setQuantity('');
      setNotes('');
      onGoldAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record gold received');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Pure Gold"
      description={`From Client: ${clientName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Remaining pure gold badge if > 0 */}
        {remainingPureGold > 0 && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Remaining Pure Gold</span>
            <span className="text-base font-extrabold text-amber-800">
              {formatQuantity(remainingPureGold, 'g')}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Pure Gold Quantity"
            type="number"
            step="any"
            required
            placeholder="0"
            suffixIcon={<span className="font-bold text-slate-500 text-xs">g</span>}
            value={quantity}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError(null);
            }}
          />

          {/* Quick Fill Buttons */}
          {remainingPureGold > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickFill(50)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                50% ({formatQuantity(remainingPureGold * 0.5, 'g')})
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill(100)}
                className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-medium transition-colors"
              >
                Full ({formatQuantity(remainingPureGold, 'g')})
              </button>
            </div>
          )}
        </div>

        <Input
          label="Received Date"
          type="date"
          required
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder="e.g. 24K Gold Bar / Old gold / Scrap"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-2">
          <Button type="submit" isLoading={loading} className="w-full" size="lg">
            Save Pure Gold Received
          </Button>
        </div>
      </form>
    </Modal>
  );
};
