import React from 'react';
import { Search, X, Check, Globe } from 'lucide-react';
import { TrackMetadata } from '../services/mp3Tagger';

interface WindowsGoogleSearchAuthModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  tracksToSearch: TrackMetadata[];
  isSearching: boolean;
  onAuthorize: () => void;
  onCancel: () => void;
}

export const WindowsGoogleSearchAuthModal: React.FC<WindowsGoogleSearchAuthModalProps> = ({
  isOpen,
  isDarkMode,
  tracksToSearch,
  isSearching,
  onAuthorize,
  onCancel,
}) => {
  if (!isOpen || tracksToSearch.length === 0) return null;

  const count = tracksToSearch.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1e1e1e] border-[#383838] text-[#e0e0e0]'
            : 'bg-[#ffffff] border-neutral-300 text-neutral-800'
        }`}
      >
        {/* Title Bar */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b text-xs ${
            isDarkMode ? 'bg-[#252525] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/15 text-blue-500">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm">Ricerca Artista con Google</span>
          </div>

          <button
            onClick={onCancel}
            disabled={isSearching}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-500/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">
              Autorizzi la ricerca su Google per {count === 1 ? 'questo brano' : `questi ${count} brani`}?
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Il nome dell&apos;artista non compare nel file caricato. Con la tua autorizzazione,
              utilizzeremo Google Search per identificare automaticamente il cantante o autore principale.
            </p>
          </div>

          {/* List of affected songs */}
          <div
            className={`max-h-36 overflow-y-auto rounded-lg border p-2 space-y-1.5 ${
              isDarkMode ? 'bg-[#181818] border-[#303030]' : 'bg-[#f9fafb] border-neutral-200'
            }`}
          >
            {tracksToSearch.map((t) => (
              <div
                key={t.id}
                className={`px-2.5 py-1.5 rounded flex items-center justify-between border ${
                  isDarkMode
                    ? 'bg-[#222222] border-[#333333] text-neutral-200'
                    : 'bg-white border-neutral-200 text-neutral-800'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-[10px] text-neutral-400 font-mono truncate">
                    {t.originalFilename}
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium shrink-0">
                  Artista mancante
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`h-13 px-4 py-2 border-t flex items-center justify-end gap-2 select-none text-xs ${
            isDarkMode ? 'bg-[#242424] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSearching}
            className={`px-3.5 py-1.5 rounded border font-medium transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-[#2c2c2c] border-[#404040] hover:bg-[#383838] text-neutral-300'
                : 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={onAuthorize}
            disabled={isSearching}
            className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1070c7] disabled:opacity-50 text-white font-semibold rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {isSearching ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ricerca in corso...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Autorizza ricerca Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
