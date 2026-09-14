import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { transactionsService } from '../../services/transactionsService';
import { craftsmenService } from '../../services/craftsmenService';
import { Craftsman } from '../../types/database';
import { formatINR, formatQuantity, getTodayDateString } from '../../lib/calculations/formatters';
import {
  CARAT_PURITY_MAP,
  getPurityFromCarat,
  calculatePureQuantity,
  calculateItemCost,
  calculateCraftsmanTotalMakingCost,
  calculateCraftsmanTotalPureQuantity
} from '../../lib/calculations/craftsmanCalculations';
import { Plus, Trash2, Hammer, Scale, Sparkles } from 'lucide-react';

interface ItemReceivedRowState {
  id: string;
  item_name: string;
  gross_quantity: string;
  carat: string;
  purity_percentage: number;
  cost_per_gram: string;
  received_date: string;
  notes: string;
}

export const AddEditTransactionPage: React.FC = () => {
  const { craftsmanId, transactionId } = useParams<{ craftsmanId?: string; transactionId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(transactionId);

  const [craftsmenList, setCraftsmenList] = useState<Craftsman[]>([]);

  const [selectedCraftsmanId, setSelectedCraftsmanId] = useState<string>(craftsmanId || '');
  const [transactionDate, setTransactionDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');

  // Pure Gold Given
  const [pureGoldGiven, setPureGoldGiven] = useState<string>('');
  const [givenDate, setGivenDate] = useState<string>(getTodayDateString());
  const [givenNotes, setGivenNotes] = useState<string>('');

  // Items Received From Craftsman
  const [itemsReceived, setItemsReceived] = useState<ItemReceivedRowState[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = async () => {
    try {
      setFetching(true);
      const craftsmen = await craftsmenService.getAll();
      setCraftsmenList(craftsmen);

      if (isEditing && transactionId) {
        const tx = await transactionsService.getById(transactionId);
        if (tx) {
          setSelectedCraftsmanId(tx.craftsman_id);
          setTransactionDate(tx.transaction_date);
          setNotes(tx.notes || '');

          if (tx.materials_given && tx.materials_given.length > 0) {
            const firstGiven = tx.materials_given[0];
            setPureGoldGiven(firstGiven.quantity > 0 ? firstGiven.quantity.toString() : '');
            setGivenNotes(firstGiven.notes || '');
          }

          if (tx.items_received && tx.items_received.length > 0) {
            setItemsReceived(
              tx.items_received.map((i) => {
                const carat = i.carat || '22';
                const purity = i.purity_percentage || getPurityFromCarat(carat);
                const costPerGram = i.cost_per_gram
                  ? i.cost_per_gram.toString()
                  : (i.gross_quantity > 0 ? (i.making_cost / i.gross_quantity).toString() : '');

                return {
                  id: i.id,
                  item_name: i.item_name,
                  gross_quantity: i.gross_quantity > 0 ? i.gross_quantity.toString() : '',
                  carat,
                  purity_percentage: purity,
                  cost_per_gram: costPerGram,
                  received_date: i.received_date || tx.transaction_date,
                  notes: i.notes || '',
                };
              })
            );
          } else {
            initDefaultItem();
          }
        }
      } else {
        if (craftsmanId) setSelectedCraftsmanId(craftsmanId);
        initDefaultItem();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const initDefaultItem = () => {
    setItemsReceived([
      {
        id: `item-${Date.now()}`,
        item_name: '',
        gross_quantity: '',
        carat: '22',
        purity_percentage: 92,
        cost_per_gram: '',
        received_date: getTodayDateString(),
        notes: '',
      },
    ]);
  };

  useEffect(() => {
    loadInitial();
  }, [craftsmanId, transactionId]);

  const handleAddItemReceived = () => {
    setItemsReceived((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        item_name: '',
        gross_quantity: '',
        carat: '22',
        purity_percentage: 92,
        cost_per_gram: '',
        received_date: transactionDate || getTodayDateString(),
        notes: '',
      },
    ]);
  };

  const handleRemoveItemReceived = (index: number) => {
    setItemsReceived((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: keyof ItemReceivedRowState, val: any) => {
    setItemsReceived((prev) => {
      const updated = [...prev];
      if (field === 'carat') {
        const caratVal = val as string;
        const purity = getPurityFromCarat(caratVal);
        updated[index] = { ...updated[index], carat: caratVal, purity_percentage: purity };
      } else {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  // Helper for number input sanitization (empty string on clear, prevents 0150 concatenation)
  const handleNumberInput = (val: string, index: number, field: keyof ItemReceivedRowState) => {
    if (val === '') {
      handleItemFieldChange(index, field, '');
      return;
    }
    const num = Number(val);
    if (!isNaN(num)) {
      handleItemFieldChange(index, field, val);
    }
  };

  // Computed values
  const pureGoldGivenNum = Number(pureGoldGiven) || 0;

  const computedItems = itemsReceived.map((item) => {
    const gross = Number(item.gross_quantity) || 0;
    const purity = item.purity_percentage || getPurityFromCarat(item.carat);
    const pure = calculatePureQuantity(gross, purity);
    const costPerGram = Number(item.cost_per_gram) || 0;
    const itemCost = calculateItemCost(gross, costPerGram);

    return {
      ...item,
      pure_quantity: pure,
      making_cost: itemCost,
      cost_per_gram_num: costPerGram,
    };
  });

  const totalPureQuantityReceived = calculateCraftsmanTotalPureQuantity(computedItems);
  const totalItemsCost = calculateCraftsmanTotalMakingCost(computedItems);
  const pureGoldRemaining = Math.round((pureGoldGivenNum - totalPureQuantityReceived) * 1000) / 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCraftsmanId) {
      setError('Please select a craftsman');
      return;
    }
    if (!transactionDate) {
      setError('Transaction date is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedGiven = [
        {
          material_name: 'Pure Gold',
          quantity: pureGoldGivenNum,
          unit: 'g',
          notes: givenNotes.trim() || undefined,
        },
      ];

      const formattedReceived = itemsReceived
        .filter((i) => i.item_name.trim() && Number(i.gross_quantity) > 0)
        .map((i) => {
          const gross = Number(i.gross_quantity) || 0;
          const purity = i.purity_percentage || getPurityFromCarat(i.carat);
          const pure = calculatePureQuantity(gross, purity);
          const costPerGram = Number(i.cost_per_gram) || 0;
          const makingCost = calculateItemCost(gross, costPerGram);

          return {
            item_name: i.item_name.trim(),
            gross_quantity: gross,
            unit: 'g',
            carat: i.carat,
            purity_percentage: purity,
            pure_quantity: pure,
            cost_per_gram: costPerGram,
            making_cost: makingCost,
            received_date: i.received_date || transactionDate,
            notes: i.notes.trim() || undefined,
          };
        });

      if (isEditing && transactionId) {
        await transactionsService.update(transactionId, {
          craftsman_id: selectedCraftsmanId,
          transaction_date: transactionDate,
          notes: notes.trim() || undefined,
          materials_given: formattedGiven,
          items_received: formattedReceived,
        });
        navigate(`/craftsman-transactions/${transactionId}`);
      } else {
        const created = await transactionsService.create({
          craftsman_id: selectedCraftsmanId,
          transaction_date: transactionDate,
          notes: notes.trim() || undefined,
          materials_given: formattedGiven,
          items_received: formattedReceived,
        });
        navigate(`/craftsman-transactions/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">Loading form...</div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={isEditing ? 'Edit Transaction' : 'New Craftsman Transaction'}
        subtitle="Gold Craftsman Management"
        showBack
      />

      <form onSubmit={handleSubmit} className="px-4 sm:px-6 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* 1. Craftsman */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Craftsman
          </h3>

          <Select
            label="Craftsman"
            required
            value={selectedCraftsmanId}
            onChange={(e) => setSelectedCraftsmanId(e.target.value)}
          >
            <option value="">-- Select Craftsman --</option>
            {craftsmenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* 2. Pure Gold Given */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-soft space-y-4 bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Pure Gold Given
              </h3>
              <p className="text-[11px] text-amber-700/80">Amount of 24K pure gold handed over to craftsman</p>
            </div>
          </div>

          <div className="p-3.5 bg-white border border-amber-200/60 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Pure Gold Quantity"
                type="number"
                step="any"
                placeholder="0"
                suffixIcon={<span className="text-xs font-bold text-slate-400">g</span>}
                value={pureGoldGiven}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setPureGoldGiven('');
                  else if (!isNaN(Number(val))) setPureGoldGiven(val);
                }}
                required
              />

              <Input
                label="Date Given"
                type="date"
                required
                value={givenDate}
                onChange={(e) => {
                  setGivenDate(e.target.value);
                  setTransactionDate(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Items Received from Craftsman */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-sm">
                <Hammer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Items Received From Craftsman ({itemsReceived.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Auto-calculates pure gold (Weight × Carat %) & Total cost (Weight × Cost/g)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {itemsReceived.map((item, index) => {
              const gross = Number(item.gross_quantity) || 0;
              const purity = item.purity_percentage || getPurityFromCarat(item.carat);
              const pure = calculatePureQuantity(gross, purity);
              const costPerGram = Number(item.cost_per_gram) || 0;
              const itemCost = calculateItemCost(gross, costPerGram);

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Item #{index + 1}</span>
                    </span>
                    {itemsReceived.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemReceived(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Item Name */}
                  <Input
                    label="Item Name"
                    placeholder="e.g. Ring, Chain, Necklace, Bangle, Earring"
                    value={item.item_name}
                    onChange={(e) => handleItemFieldChange(index, 'item_name', e.target.value)}
                    required
                  />

                  {/* Weight & Carat */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      label="Weight (Quantity)"
                      type="number"
                      step="any"
                      placeholder="0"
                      suffixIcon={<span className="text-xs font-bold text-slate-400">g</span>}
                      value={item.gross_quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput(e.target.value, index, 'gross_quantity')}
                      required
                    />

                    <Select
                      label="Carat"
                      value={item.carat}
                      onChange={(e) => handleItemFieldChange(index, 'carat', e.target.value)}
                    >
                      <option value="24">24K (100%)</option>
                      <option value="22">22K (92%)</option>
                      <option value="18">18K (76%)</option>
                      <option value="14">14K (59%)</option>
                    </Select>
                  </div>

                  {/* Pure Gold Calculated Badge */}
                  <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-amber-900 font-semibold">
                      Pure Gold ({item.gross_quantity || 0}g × {purity}%):
                    </span>
                    <span className="font-black text-amber-900 text-sm tracking-tight">
                      {pure > 0 ? `${pure} g` : '0 g'}
                    </span>
                  </div>

                  {/* Cost per gram & Total Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                    <Input
                      label="Cost Per Gram"
                      type="number"
                      step="any"
                      placeholder="0"
                      prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                      value={item.cost_per_gram}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput(e.target.value, index, 'cost_per_gram')}
                      required
                    />

                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between h-[46px] text-xs">
                      <span className="text-slate-600 font-semibold">Item Total Cost:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatINR(itemCost)}
                      </span>
                    </div>
                  </div>

                  {/* Received Date */}
                  <div>
                    <Input
                      label="Received Date"
                      type="date"
                      required
                      value={item.received_date}
                      onChange={(e) => handleItemFieldChange(index, 'received_date', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItemReceived}
            className="w-full border-dashed"
            icon={<Plus className="w-4 h-4" />}
          >
            + Add Another Received Item
          </Button>

          {/* Transaction Totals Summary */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Craftsman Transaction Summary
            </div>

            {/* Pure Gold Balance Grid */}
            <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-800">
              <div className="text-left">
                <span className="text-[10px] text-amber-300/80 uppercase font-semibold block">Pure Gold Given</span>
                <span className="text-sm font-extrabold text-white">{formatQuantity(pureGoldGivenNum, 'g')}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-300/80 uppercase font-semibold block">Pure Gold Recv</span>
                <span className="text-sm font-extrabold text-amber-300">{formatQuantity(totalPureQuantityReceived, 'g')}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-300/80 uppercase font-semibold block">Pure Gold Left</span>
                <span className={`text-sm font-extrabold ${pureGoldRemaining > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatQuantity(pureGoldRemaining, 'g')}
                </span>
              </div>
            </div>

            {/* Total Cost of All Items */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-300 font-semibold">Total Cost of All Items:</span>
              <span className="font-extrabold text-white text-base">
                {formatINR(totalItemsCost)}
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="w-full"
          size="lg"
        >
          {isEditing ? 'Update Transaction' : 'Save Transaction'}
        </Button>
      </form>
    </div>
  );
};
