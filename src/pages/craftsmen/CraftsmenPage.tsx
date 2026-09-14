import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CraftsmanCard } from '../../components/craftsmen/CraftsmanCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { CraftsmanWithDetails } from '../../types/models';
import { craftsmenService } from '../../services/craftsmenService';
import { Plus, Hammer, Loader2 } from 'lucide-react';

export const CraftsmenPage: React.FC = () => {
  const navigate = useNavigate();
  const [craftsmen, setCraftsmen] = useState<CraftsmanWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCraftsmen = async (query = '') => {
    try {
      setLoading(true);
      const data = await craftsmenService.getAll(query);
      setCraftsmen(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCraftsmen(search);
  }, [search]);

  return (
    <div className="space-y-4">
      <Header
        title="Craftsmen"
        subtitle={`${craftsmen.length} registered craftsmen`}
        showBack
        rightAction={
          <Button
            size="sm"
            onClick={() => navigate('/craftsmen/new')}
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
          placeholder="Search craftsman name or phone..."
        />

        {/* Craftsman List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span className="text-xs font-medium">Loading craftsmen...</span>
          </div>
        ) : craftsmen.length === 0 ? (
          <EmptyState
            icon={<Hammer className="w-6 h-6" />}
            title={search ? 'No craftsmen found' : 'No craftsmen yet'}
            description={
              search
                ? 'Try searching with a different name or phone number.'
                : 'Add your craftsmen to track raw materials given, finished items received, pure material calculations, and making charge payments.'
            }
            actionText={search ? undefined : '+ Add First Craftsman'}
            onAction={() => navigate('/craftsmen/new')}
          />
        ) : (
          <div className="space-y-3">
            {craftsmen.map((craftsman) => (
              <CraftsmanCard key={craftsman.id} craftsman={craftsman} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
