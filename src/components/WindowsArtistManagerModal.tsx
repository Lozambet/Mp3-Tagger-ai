import React, { useState, useEffect } from 'react';
import {
  KnownArtist,
  getKnownArtists,
  fetchKnownArtistsFromCloud,
  saveBatchArtistsToCloud,
  removeArtistFromCloud,
  resetArtistsInCloud,
} from '../utils/artistDictionary';
import {
  X,
  Users,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  Check,
  Database,
  RefreshCw,
} from 'lucide-react';

interface WindowsArtistManagerModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onArtistsChanged: () => void;
}

export const WindowsArtistManagerModal: React.FC<WindowsArtistManagerModalProps> = ({
  isOpen,
  isDarkMode,
  onClose,
  onArtistsChanged,
}) => {
  const [artists, setArtists] = useState<KnownArtist[]>(() => getKnownArtists());
  const [newArtistName, setNewArtistName] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFromCloud();
    }
  }, [isOpen]);

  const loadFromCloud = async () => {
    setIsLoading(true);
    try {
      const cloudArtists = await fetchKnownArtistsFromCloud();
      setArtists(cloudArtists);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newArtistName.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const updated = await saveBatchArtistsToCloud([trimmed]);
      setArtists(updated);
      showToast(`Salvato nel Cloud SQL: "${trimmed}"`);
      setNewArtistName('');
      onArtistsChanged();
    } catch {
      showToast('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (name: string) => {
    setIsLoading(true);
    try {
      const updated = await removeArtistFromCloud(name);
      setArtists(updated);
      showToast(`Rimosso dal Cloud: "${name}"`);
      onArtistsChanged();
    } catch {
      showToast('Errore durante la rimozione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Vuoi ripristinare l\'elenco predefinito nel database Cloud SQL?')) return;
    setIsLoading(true);
    try {
      const updated = await resetArtistsInCloud();
      setArtists(updated);
      showToast('Ripristinato elenco predefinito nel Cloud SQL');
      onArtistsChanged();
    } catch {
      showToast('Errore durante il ripristino');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArtists = artists.filter((a) =>
    a.canonical.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1f1f1f] border-[#383838] text-[#e0e0e0]'
            : 'bg-[#ffffff] border-neutral-300 text-neutral-800'
        }`}
      >
        {/* Modal Title Bar */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b text-xs select-none ${
            isDarkMode ? 'bg-[#262626] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm">Cantanti Noti</span>
            <span className="text-neutral-400 text-xs">({artists.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadFromCloud}
              disabled={isLoading}
              title="Aggiorna elenco"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-500/20 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
          {/* Add New Artist Form */}
          <form onSubmit={handleAddArtist} className="flex gap-2">
            <input
              type="text"
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              placeholder="Aggiungi nuovo cantante (es. Kid Yugi, Paky, Baby Gang...)"
              disabled={isLoading}
              className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                isDarkMode ? 'bg-[#292929] border-[#404040]' : 'bg-white border-neutral-300'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !newArtistName.trim()}
              className="px-3.5 py-1.5 bg-[#0067c0] hover:bg-[#1070c7] disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi</span>
            </button>
          </form>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cerca cantante nel dizionario..."
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded border ${
                isDarkMode ? 'bg-[#252525] border-[#383838]' : 'bg-neutral-50 border-neutral-200'
              }`}
            />
          </div>

          {/* Toast Alert */}
          {toastMessage && (
            <div className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded flex items-center gap-1.5 animate-in fade-in duration-100">
              <Check className="w-3 h-3" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Artists Tag Grid */}
          <div
            className={`flex-1 overflow-y-auto p-2 rounded border max-h-64 ${
              isDarkMode ? 'bg-[#181818] border-[#303030]' : 'bg-[#fafafa] border-neutral-200'
            }`}
          >
            <div className="flex flex-wrap gap-1.5">
              {filteredArtists.length === 0 ? (
                <div className="text-xs text-neutral-400 p-2 italic">
                  {isLoading ? 'Caricamento dal database Cloud SQL...' : 'Nessun cantante trovato.'}
                </div>
              ) : (
                filteredArtists.map((artist) => (
                  <span
                    key={artist.canonical}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border group transition-colors ${
                      isDarkMode
                        ? 'bg-[#242424] border-[#3a3a3a] text-neutral-200 hover:border-neutral-500'
                        : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 shadow-2xs'
                    }`}
                  >
                    <span>{artist.canonical}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(artist.canonical)}
                      title={`Rimuovi ${artist.canonical} dal database Cloud SQL`}
                      className="text-neutral-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`h-12 px-4 border-t flex items-center justify-between select-none text-xs ${
            isDarkMode ? 'bg-[#242424] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Ripristina l'elenco iniziale predefinito su Cloud SQL"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Ripristina predefiniti Cloud</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1070c7] text-white font-semibold rounded shadow-xs cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
