import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { clientsService } from '../../services/clientsService';
import { Phone } from 'lucide-react';

export const AddEditClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const isEditing = Boolean(clientId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      const load = async () => {
        try {
          const client = await clientsService.getById(clientId);
          if (client) {
            setName(client.name);
            setPhone(client.phone || '');
            setNotes(client.notes || '');
          } else {
            navigate('/clients');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      load();
    }
  }, [clientId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Client name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && clientId) {
        await clientsService.update(clientId, {
          name: trimmedName,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        navigate(`/clients/${clientId}`);
      } else {
        const created = await clientsService.create({
          name: trimmedName,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        navigate(`/clients/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">Loading client details...</div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={isEditing ? 'Edit Client' : 'Add New Client'}
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
            label="Client Name"
            placeholder="e.g. Rahul Sharma"
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
            placeholder="+91 98765 43210"
            prefixIcon={<Phone className="w-4 h-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Textarea
            label="Notes (Optional)"
            placeholder="Preferences, referral notes, etc."
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
          {isEditing ? 'Update Client' : 'Save Client'}
        </Button>
      </form>
    </div>
  );
};
