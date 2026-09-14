import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { transactionsService } from '../../services/transactionsService';
import { getTodayDateString } from '../../lib/calculations/formatters';
import { Scale } from 'lucide-react';

interface AddCraftsmanGoldGivenModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  onGoldAdded: () => void;
}

export const AddCraftsmanGoldGivenModal: React.FC<AddCraftsmanGoldGivenModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  onGoldAdded,
}) => {
  const [quantity, setQuantity] = useState('');
  const [givenDate, setGivenDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      setError('Please enter a valid pure gold quantity');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await transactionsService.addGoldGiven({
        transaction_id: transactionId,
        material_name: 'Pure Gold',
        quantity: qty,
        unit: 'g',
        given_date: givenDate,
      });

      setQuantity('');
      setGivenDate(getTodayDateString());
      onGoldAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to record pure gold given');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Pure Gold Given">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Pure Gold Quantity"
          type="number"
          step="any"
          placeholder="0"
          suffixIcon={<span className="text-xs font-bold text-slate-400">g</span>}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Date Given"
          type="date"
          required
          value={givenDate}
          onChange={(e) => setGivenDate(e.target.value)}
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
            icon={<Scale className="w-4 h-4" />}
          >
            Add Pure Gold
          </Button>
        </div>
      </form>
    </Modal>
  );
};
