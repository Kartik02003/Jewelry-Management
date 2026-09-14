import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { jewelryService } from '../../services/jewelryService';
import { clientsService } from '../../services/clientsService';
import { Client } from '../../types/database';
import { formatINR } from '../../lib/calculations/formatters';

export const AddEditJewelryPage: React.FC = () => {
  const { clientId, jewelryId } = useParams<{ clientId?: string; jewelryId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(jewelryId);

  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState<boolean>(false);

  // Section 1: Gold and Silver
  const [includeMetal, setIncludeMetal] = useState(true);
  const [metalType, setMetalType] = useState<'Gold' | 'Silver'>('Gold');
  const [goldCarat, setGoldCarat] = useState('22');
  const [metalQuantity, setMetalQuantity] = useState('');
  const [metalPercentage, setMetalPercentage] = useState('');
  const [metalUnitCost, setMetalUnitCost] = useState('');
  const [metalMakingRate, setMetalMakingRate] = useState('');

  // Section 2: Diamond (Single section, no add button)
  const [diamondQuantity, setDiamondQuantity] = useState('');
  const [diamondUnitCost, setDiamondUnitCost] = useState('');

  // Section 3: Cls (Single section, no add button)
  const [clsQuantity, setClsQuantity] = useState('');
  const [clsUnitCost, setClsUnitCost] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sanitizes number input to prevent leading zeroes like 0150
  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    let cleaned = value;
    if (/^0[0-9]+/.test(cleaned)) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }
    setter(cleaned);
  };

  const loadInitial = async () => {
    try {
      setFetching(true);
      if (isEditing && jewelryId) {
        const j = await jewelryService.getById(jewelryId);
        if (j) {
          setName(j.name);
          setDescription(j.description || '');
          if (j.client) setClient(j.client);
          if (j.images && j.images.length > 0) {
            setExistingImageUrl(j.images[0].storage_path);
          }

          if (j.materials && j.materials.length > 0) {
            // Find base metal
            const metalMat = j.materials.find((m) => {
              const nm = m.material_name.toLowerCase();
              return nm.includes('gold') || nm.includes('silver');
            });

            if (metalMat) {
              setIncludeMetal(true);
              const isSilver = metalMat.material_name.toLowerCase().includes('silver');
              setMetalType(isSilver ? 'Silver' : 'Gold');
              setMetalQuantity(metalMat.quantity ? metalMat.quantity.toString() : '');
              setMetalUnitCost(metalMat.unit_cost ? metalMat.unit_cost.toString() : '');
              setMetalMakingRate(metalMat.making_rate ? metalMat.making_rate.toString() : '');
              if (metalMat.purity_percentage) {
                setMetalPercentage(metalMat.purity_percentage.toString());
              }

              // Parse Carat if Gold
              if (!isSilver) {
                const caratMatch = (metalMat.material_name + ' ' + (metalMat.unit || '')).match(/\b(24|22|18|14|9)\b/);
                if (caratMatch) {
                  setGoldCarat(caratMatch[1]);
                } else {
                  setGoldCarat('22');
                }
              }
            } else {
              setIncludeMetal(false);
            }

            // Diamond
            const dMat = j.materials.find((m) => {
              const nm = m.material_name.toLowerCase();
              return nm.includes('diamond');
            });
            if (dMat) {
              setDiamondQuantity(dMat.quantity ? dMat.quantity.toString() : '');
              setDiamondUnitCost(dMat.unit_cost ? dMat.unit_cost.toString() : '');
            }

            // Cls
            const clsMat = j.materials.find((m) => {
              const nm = m.material_name.toLowerCase();
              return !nm.includes('gold') && !nm.includes('silver') && !nm.includes('diamond');
            });
            if (clsMat) {
              setClsQuantity(clsMat.quantity ? clsMat.quantity.toString() : '');
              setClsUnitCost(clsMat.unit_cost ? clsMat.unit_cost.toString() : '');
            }
          }
        }
      } else if (clientId) {
        const c = await clientsService.getById(clientId);
        setClient(c);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [clientId, jewelryId]);

  // Calculations for Section 1: Gold and Silver
  const metalQtyNum = includeMetal ? Number(metalQuantity) || 0 : 0;
  const metalCostNum = includeMetal ? Number(metalUnitCost) || 0 : 0;
  const metalMakingNum = includeMetal ? Number(metalMakingRate) || 0 : 0;
  const metalPercentageNum = metalType === 'Gold' ? Number(metalPercentage) || 0 : 0;
  const pureGoldQty = Math.round((metalQtyNum * (metalPercentageNum / 100)) * 1000) / 1000;

  const metalBaseAmount = Math.round(metalQtyNum * metalCostNum * 100) / 100;
  const metalMakingAmount = Math.round(metalQtyNum * metalMakingNum * 100) / 100;
  const metalTotal = Math.round((metalBaseAmount + metalMakingAmount) * 100) / 100;

  // Calculations for Section 2: Diamond
  const diamondQtyNum = Number(diamondQuantity) || 0;
  const diamondCostNum = Number(diamondUnitCost) || 0;
  const diamondTotal = Math.round(diamondQtyNum * diamondCostNum * 100) / 100;

  // Calculations for Section 3: Cls
  const clsQtyNum = Number(clsQuantity) || 0;
  const clsCostNum = Number(clsUnitCost) || 0;
  const clsTotal = Math.round(clsQtyNum * clsCostNum * 100) / 100;

  // Total Material Cost (Includes Metal, Making, Diamond, Cls)
  const grandMaterialTotal = Math.round((metalTotal + diamondTotal + clsTotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Jewelry name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedMaterials: Array<{
        material_name: string;
        quantity: number;
        unit: string;
        unit_cost: number;
        making_rate: number;
        purity_percentage: number;
        pure_quantity: number;
      }> = [];

      // 1. Add Gold / Silver if enabled and quantity > 0
      if (includeMetal && metalQtyNum > 0) {
        const matName = metalType === 'Gold' ? `Gold (${goldCarat}K)` : 'Silver';
        formattedMaterials.push({
          material_name: matName,
          quantity: metalQtyNum,
          unit: 'g',
          unit_cost: metalCostNum,
          making_rate: metalMakingNum,
          purity_percentage: metalPercentageNum,
          pure_quantity: pureGoldQty,
        });
      }

      // 2. Add Diamond if quantity > 0
      if (diamondQtyNum > 0) {
        formattedMaterials.push({
          material_name: 'Diamond',
          quantity: diamondQtyNum,
          unit: 'carat',
          unit_cost: diamondCostNum,
          making_rate: 0,
          purity_percentage: 0,
          pure_quantity: 0,
        });
      }

      // 3. Add Cls if quantity > 0
      if (clsQtyNum > 0) {
        formattedMaterials.push({
          material_name: 'Cls',
          quantity: clsQtyNum,
          unit: 'pcs',
          unit_cost: clsCostNum,
          making_rate: 0,
          purity_percentage: 0,
          pure_quantity: 0,
        });
      }

      if (isEditing && jewelryId) {
        await jewelryService.update(jewelryId, {
          name: trimmedName,
          description: description.trim() || undefined,
          materials: formattedMaterials,
          newImageFile: imageFile,
          removeExistingImage: removeExistingImage,
        });
        navigate(`/jewelry/${jewelryId}`);
      } else if (clientId) {
        const created = await jewelryService.create({
          client_id: clientId,
          name: trimmedName,
          description: description.trim() || undefined,
          materials: formattedMaterials,
          imageFile: imageFile,
        });
        navigate(`/jewelry/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save jewelry order');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">Loading form...</div>
    );
  }

  const currentMetalLabel = metalType === 'Gold' ? `Gold (${goldCarat}K)` : 'Silver';

  return (
    <div className="space-y-4 pb-12">
      <Header
        title={isEditing ? 'Edit Jewelry Order' : 'Create Jewelry Order'}
        subtitle={client ? `For Client: ${client.name}` : undefined}
        showBack
      />

      <form onSubmit={handleSubmit} className="px-4 sm:px-6 space-y-5 max-w-xl mx-auto">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Basic Information & Image */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Basic Information
          </h3>

          <Input
            label="Jewelry Name"
            placeholder="e.g. Diamond Ring, Gold Necklace, Cls Bangles"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Custom specifications, design notes, client requests..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <ImagePicker
            currentImageUrl={existingImageUrl}
            onImageSelected={(file) => {
              setImageFile(file);
              setRemoveExistingImage(true);
            }}
            onImageRemoved={() => {
              setImageFile(null);
              setExistingImageUrl(null);
              setRemoveExistingImage(true);
            }}
          />
        </div>

        {/* SECTION 1: GOLD AND SILVER */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Gold and Silver
                </h3>
                <p className="text-[11px] text-slate-400">Select metal & configure rate with making</p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMetal}
                onChange={(e) => setIncludeMetal(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
              />
              <span>Include Metal</span>
            </label>
          </div>

          {includeMetal && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
              {/* Option to select from Gold and Silver */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Metal
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetalType('Gold')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                      metalType === 'Gold'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-500" />
                    <span>Gold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetalType('Silver')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                      metalType === 'Silver'
                        ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm ring-2 ring-slate-400/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400" />
                    <span>Silver</span>
                  </button>
                </div>
              </div>

              {/* Row 1: Quantity, Carat (only for Gold), Rate */}
              <div className={`grid ${metalType === 'Gold' ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
                <Input
                  label="Quantity"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={metalQuantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setMetalQuantity)}
                  required={includeMetal}
                />

                {metalType === 'Gold' && (
                  <Select
                    label="Carat"
                    value={goldCarat}
                    onChange={(e) => setGoldCarat(e.target.value)}
                  >
                    <option value="24">24</option>
                    <option value="22">22</option>
                    <option value="18">18</option>
                    <option value="14">14</option>
                    <option value="9">9</option>
                  </Select>
                )}

                <Input
                  label="Rate"
                  type="number"
                  step="any"
                  placeholder="0"
                  prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                  value={metalUnitCost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setMetalUnitCost)}
                  required={includeMetal}
                />
              </div>

              {/* Row 2: Percentage & Pure Gold (only for Gold, above Making) */}
              {metalType === 'Gold' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                  <Input
                    label="Percentage (%)"
                    type="number"
                    step="any"
                    placeholder="0"
                    suffixIcon={<span className="text-xs font-bold text-slate-400">%</span>}
                    value={metalPercentage}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleNumberInput(e.target.value, setMetalPercentage)}
                  />

                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between h-[46px]">
                    <span className="text-xs font-bold text-amber-900">Pure Gold:</span>
                    <span className="text-sm font-black text-amber-800 tracking-tight">
                      {pureGoldQty > 0 ? pureGoldQty : '0'}
                    </span>
                  </div>
                </div>
              )}

              {/* Row 3: Making */}
              <div>
                <Input
                  label="Making"
                  type="number"
                  step="any"
                  placeholder="0"
                  prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                  value={metalMakingRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setMetalMakingRate)}
                />
              </div>

              {/* Making and Metal calculation breakdown */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Metal Value ({metalQuantity || 0} × {formatINR(metalCostNum)}):</span>
                  <span className="font-semibold text-slate-700">{formatINR(metalBaseAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Making Amount ({metalQuantity || 0} × {formatINR(metalMakingNum)}):</span>
                  <span className="font-semibold text-amber-700">{formatINR(metalMakingAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 font-bold">
                  <span className="text-slate-800">{currentMetalLabel} Total (Metal + Making):</span>
                  <span className="text-sm font-extrabold text-slate-900">{formatINR(metalTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: DIAMOND */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Diamond
              </h3>
              <p className="text-[11px] text-slate-400">Enter quantity & rate</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                type="number"
                step="any"
                placeholder="0"
                value={diamondQuantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleNumberInput(e.target.value, setDiamondQuantity)}
              />

              <Input
                label="Rate"
                type="number"
                step="any"
                placeholder="0"
                prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                value={diamondUnitCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleNumberInput(e.target.value, setDiamondUnitCost)}
              />
            </div>

            {/* Diamond Total Breakdown */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Diamond Total:</span>
              <span className="font-extrabold text-slate-900">{formatINR(diamondTotal)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: CLS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Cls
              </h3>
              <p className="text-[11px] text-slate-400">Enter quantity & rate</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                type="number"
                step="any"
                placeholder="0"
                value={clsQuantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleNumberInput(e.target.value, setClsQuantity)}
              />

              <Input
                label="Rate"
                type="number"
                step="any"
                placeholder="0"
                prefixIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                value={clsUnitCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleNumberInput(e.target.value, setClsUnitCost)}
              />
            </div>

            {/* Cls Total Breakdown */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Cls Total:</span>
              <span className="font-extrabold text-slate-900">{formatINR(clsTotal)}</span>
            </div>
          </div>
        </div>

        {/* TOTAL JEWELRY MATERIAL COST SUMMARY */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl shadow-card space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Order Material Breakdown</span>
            <span>Summary</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {includeMetal && metalTotal > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span>{currentMetalLabel} (with Making):</span>
                <span className="font-semibold text-white">{formatINR(metalTotal)}</span>
              </div>
            )}
            {diamondTotal > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Diamond:</span>
                <span className="font-semibold text-white">{formatINR(diamondTotal)}</span>
              </div>
            )}
            {clsTotal > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Cls:</span>
                <span className="font-semibold text-white">{formatINR(clsTotal)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Material Cost
              </span>
              <span className="text-xs text-slate-400">Total payable by client</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-primary-300 tracking-tight">
              {formatINR(grandMaterialTotal)}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="w-full"
          size="lg"
        >
          {isEditing ? 'Update Jewelry Order' : 'Save Jewelry Order'}
        </Button>
      </form>
    </div>
  );
};
