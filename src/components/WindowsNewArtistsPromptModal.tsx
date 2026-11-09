import React, { useState } from 'react';
import { Database, Check, X, UserPlus, Sparkles, AlertCircle } from 'lucide-react';

interface WindowsNewArtistsPromptModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  newArtists: string[];
  onSaveToCloud: (selectedArtists: string[]) => Promise<void>;
  onIgnore: () => void;
}

export const WindowsNewArtistsPromptModal: React.FC<WindowsNewArtistsPromptModalProps> = ({
  isOpen,
  isDarkMode,
  newArtists,
  onSaveToCloud,
  onIgnore,
}) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(newArtists));
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || newArtists.length === 0) return null;

  const toggleArtist = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(newArtists));
  const deselectAll = () => setSelected(new Set());

  const handleConfirm = async () => {
    if (selected.size === 0) {
      onIgnore();
      return;
    }
    setIsSaving(true);
    try {
      await onSaveToCloud(Array.from(selected));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1e1e1e] border-[#383838] text-[#e0e0e0]'
            : 'bg-[#ffffff] border-neutral-300 text-neutral-800'
        }`}
      >
        {/* Windows 11 Dialog Titlebar */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b text-xs ${
            isDarkMode ? 'bg-[#252525] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/20 text-blue-400">
              <Database className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm">Nuovi Cantanti Rilevati</span>
          </div>

          <button
            onClick={onIgnore}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-500/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-sm">
                Aggiungere i nuovi cantanti all'elenco?
              </p>
              <p className="text-neutral-500 dark:text-neutral-400">
                Verranno memorizzati per riconoscere automaticamente titolo e featuring nelle prossime canzoni.
              </p>
            </div>
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <span>
              {selected.size} di {newArtists.length} selezionati
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-blue-500 underline transition-colors cursor-pointer"
              >
                Seleziona tutti
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="hover:text-blue-500 underline transition-colors cursor-pointer"
              >
                Deseleziona
              </button>
            </div>
          </div>

          {/* Artists Checkbox List */}
          <div
            className={`max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1.5 ${
              isDarkMode ? 'bg-[#181818] border-[#303030]' : 'bg-[#f9fafb] border-neutral-200'
            }`}
          >
            {newArtists.map((artist) => {
              const isChecked = selected.has(artist);
              return (
                <label
                  key={artist}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors border ${
                    isChecked
                      ? isDarkMode
                        ? 'bg-blue-950/30 border-blue-800/60 text-blue-200'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                      : isDarkMode
                      ? 'bg-[#222222] border-transparent hover:border-[#383838]'
                      : 'bg-white border-transparent hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArtist(artist)}
                      className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold">{artist}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`h-14 px-5 border-t flex items-center justify-end gap-2.5 text-xs ${
            isDarkMode ? 'bg-[#252525] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <button
            type="button"
            onClick={onIgnore}
            disabled={isSaving}
            className={`px-4 py-2 rounded-md font-medium border transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-[#404040] hover:bg-[#303030] text-neutral-300'
                : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Ignora
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || selected.size === 0}
            className="px-5 py-2 bg-[#0067c0] hover:bg-[#1070c7] disabled:opacity-50 text-white font-semibold rounded-md flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvataggio...</span>
              </span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Salva ({selected.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
