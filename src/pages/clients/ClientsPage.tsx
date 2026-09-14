import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { ClientCard } from '../../components/clients/ClientCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClientWithDetails } from '../../types/models';
import { clientsService } from '../../services/clientsService';
import { Plus, Users, Loader2 } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClients = async (query = '') => {
    try {
      setLoading(true);
      const data = await clientsService.getAll(query);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients(search);
  }, [search]);

  return (
    <div className="space-y-4">
      <Header
        title="Clients"
        subtitle={`${clients.length} registered clients`}
        showBack
        rightAction={
          <Button
            size="sm"
            onClick={() => navigate('/clients/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            Add
          </Button>
        }
      />

      <div className="px-4 sm:px-6 space-y-4">
        {/* Search Bar */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by client name or phone..."
        />

        {/* Client List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span className="text-xs font-medium">Loading clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={search ? 'No clients found' : 'No clients yet'}
            description={
              search
                ? 'Try searching with a different name or phone number.'
                : 'Add your first client to start creating jewelry orders and tracking payments.'
            }
            actionText={search ? undefined : '+ Add First Client'}
            onAction={() => navigate('/clients/new')}
          />
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
