import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { craftsmenService } from '../../services/craftsmenService';
import { Phone } from 'lucide-react';

export const AddEditCraftsmanPage: React.FC = () => {
  const navigate = useNavigate();
  const { craftsmanId } = useParams<{ craftsmanId?: string }>();
  const isEditing = Boolean(craftsmanId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (craftsmanId) {
      const load = async () => {
        try {
          const craftsman = await craftsmenService.getById(craftsmanId);
          if (craftsman) {
            setName(craftsman.name);
            setPhone(craftsman.phone || '');
            setNotes(craftsman.notes || '');
          } else {
            navigate('/craftsmen');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      load();
    }
  }, [craftsmanId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Craftsman name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && craftsmanId) {
        await craftsmenService.update(craftsmanId, {
          name: trimmedName,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        navigate(`/craftsmen/${craftsmanId}`);
      } else {
        const created = await craftsmenService.create({
          name: trimmedName,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        navigate(`/craftsmen/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save craftsman');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">Loading craftsman details...</div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={isEditing ? 'Edit Craftsman' : 'Add New Craftsman'}
        showBack
      />

      <form onSubmit={handleSubmit} className="px-4 sm:px-6 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <Input
            label="Craftsman Name"
            placeholder="e.g. Amit, Rajesh Goldsmith"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98123 45678"
            prefixIcon={<Phone className="w-4 h-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Textarea
            label="Notes (Optional)"
            placeholder="Specialty (e.g. Bangles, Diamond setting), terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="w-full"
          size="lg"
        >
          {isEditing ? 'Update Craftsman' : 'Save Craftsman'}
        </Button>
      </form>
    </div>
  );
};
