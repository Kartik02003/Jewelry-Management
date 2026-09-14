import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { transactionsService } from '../../services/transactionsService';
import { getTodayDateString, formatINR } from '../../lib/calculations/formatters';
import {
  getPurityFromCarat,
  calculatePureQuantity,
  calculateItemCost
} from '../../lib/calculations/craftsmanCalculations';
import { Hammer } from 'lucide-react';

interface AddCraftsmanItemReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  onItemAdded: () => void;
}

export const AddCraftsmanItemReceivedModal: React.FC<AddCraftsmanItemReceivedModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  onItemAdded,
}) => {
  const [itemName, setItemName] = useState('');
  const [weight, setWeight] = useState('');
  const [carat, setCarat] = useState('22');
  const [costPerGram, setCostPerGram] = useState('');
  const [receivedDate, setReceivedDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gross = Number(weight) || 0;
  const purity = getPurityFromCarat(carat);
  const pureGold = calculatePureQuantity(gross, purity);
  const costGram = Number(costPerGram) || 0;
  const totalCost = calculateItemCost(gross, costGram);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Please enter item name');
      return;
    }
    if (gross <= 0) {
      setError('Please enter a valid weight');
      return;
    }
    if (costGram <= 0) {
      setError('Please enter cost per gram');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await transactionsService.addItemReceived({
        transaction_id: transactionId,
        item_name: itemName.trim(),
        gross_quantity: gross,
        unit: 'g',
        carat: carat,
        purity_percentage: purity,
        pure_quantity: pureGold,
        cost_per_gram: costGram,
        making_cost: totalCost,
        received_date: receivedDate,
      });

      // Reset form
      setItemName('');
      setWeight('');
      setCarat('22');
      setCostPerGram('');
      setReceivedDate(getTodayDateString());

      onItemAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to add item received');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item Received">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Item Name"
          placeholder="e.g. Ring, Chain, Necklace, Bangle"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Weight (Quantity)"
            type="number"
            step="any"
            placeholder="0"
            suffixIcon={<span className="text-xs font-bold text-slate-400">g</span>}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />

          <Select
            label="Carat"
            value={carat}
            onChange={(e) => setCarat(e.target.value)}
          >
            <option value="24">24K (100%)</option>
            <option value="22">22K (92%)</option>
            <option value="18">18K (76%)</option>
            <option value="14">14K (59%)</option>
          </Select>
        </div>

        {/* Pure Gold Calculated Preview */}
        <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
          <span className="text-amber-900 font-semibold">
            Pure Gold ({weight || 0}g × {purity}%):
          </span>
          <span className="font-black text-amber-900 text-sm tracking-tight">
            {pureGold > 0 ? `${pureGold} g` : '0 g'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Input
            label="Cost Per Gram"
            type="number"
            step="any"
            placeholder="0"
            prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
            value={costPerGram}
            onChange={(e) => setCostPerGram(e.target.value)}
            required
          />

          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between h-[46px] text-xs">
            <span className="text-slate-600 font-semibold">Total Cost:</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {formatINR(totalCost)}
            </span>
          </div>
        </div>

        <Input
          label="Received Date"
          type="date"
          required
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
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
            icon={<Hammer className="w-4 h-4" />}
          >
            Add Item
          </Button>
        </div>
      </form>
    </Modal>
  );
};
