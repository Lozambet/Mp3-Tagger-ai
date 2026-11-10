import React, { useEffect, useRef } from 'react';
import { Music, Check, X, Disc3, Sparkles } from 'lucide-react';

export interface MusicCandidate {
  id: string;
  title: string;
  artist: string;
  featuring: string;
  album: string;
  year: string;
  genre: string;
  artworkUrl?: string;
  source: 'itunes' | 'musicbrainz';
  isRapOrHipHop: boolean;
  score?: number;
}

interface CandidatePickerDropdownProps {
  candidates: MusicCandidate[];
  isLoading: boolean;
  isOpen: boolean;
  trackTitle: string;
  isDarkMode: boolean;
  onSelectCandidate: (candidate: MusicCandidate) => void;
  onClose: () => void;
  position?: 'bottom' | 'top';
}

export const CandidatePickerDropdown: React.FC<CandidatePickerDropdownProps> = ({
  candidates,
  isLoading,
  isOpen,
  trackTitle,
  isDarkMode,
  onSelectCandidate,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute left-0 top-full mt-1.5 w-84 sm:w-96 rounded-lg border shadow-2xl z-50 overflow-hidden text-xs select-none transition-all animate-in fade-in-50 zoom-in-95 ${
        isDarkMode
          ? 'bg-[#1e1e1e] border-[#383838] text-neutral-200'
          : 'bg-white border-neutral-300 text-neutral-800'
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between text-xs font-medium ${
          isDarkMode ? 'bg-[#252525] border-[#333333]' : 'bg-neutral-50 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-blue-500" />
          <span>Scegli artista per &quot;{trackTitle}&quot;</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-500/20 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          title="Chiudi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto divide-y divide-neutral-200/40 dark:divide-neutral-800/60 p-1">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Disc3 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-[11px]">Interrogazione iTunes & MusicBrainz...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-6 px-4 text-center text-neutral-400 space-y-1">
            <p className="text-xs font-medium">Nessuna corrispondenza trovata nel catalogo.</p>
            <p className="text-[11px] text-neutral-500">
              Puoi digitare direttamente il nome dell&apos;artista nel campo di testo.
            </p>
          </div>
        ) : (
          candidates.map((cand) => {
            return (
              <button
                key={cand.id}
                type="button"
                onClick={() => onSelectCandidate(cand)}
                className={`w-full text-left p-2 rounded-md flex items-center gap-2.5 transition-colors cursor-pointer group ${
                  isDarkMode
                    ? 'hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]'
                    : 'hover:bg-neutral-100 focus:bg-neutral-100'
                }`}
              >
                {/* Artwork Thumbnail or Fallback Icon */}
                <div
                  className={`w-9 h-9 rounded shrink-0 overflow-hidden border flex items-center justify-center ${
                    isDarkMode ? 'bg-[#141414] border-[#333333]' : 'bg-neutral-100 border-neutral-200'
                  }`}
                >
                  {cand.artworkUrl ? (
                    <img
                      src={cand.artworkUrl}
                      alt={cand.artist}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Music className="w-4 h-4 text-neutral-400" />
                  )}
                </div>

                {/* Candidate Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                      {cand.artist}
                    </span>
                    {cand.featuring && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        Feat. {cand.featuring}
                      </span>
                    )}
                    {cand.isRapOrHipHop && (
                      <span
                        className="text-[9px] px-1 py-0.2 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                        title="Genere Rap / Hip-Hop riconosciuto"
                      >
                        Rap
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-1">
                    <span className="truncate">{cand.title}</span>
                    {cand.album && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[110px]">{cand.album}</span>
                      </>
                    )}
                    {cand.year && (
                      <>
                        <span>·</span>
                        <span>{cand.year}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Select Arrow / Checkmark indicator */}
                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Applica</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div
        className={`px-3 py-1.5 border-t text-[10px] flex items-center justify-between ${
          isDarkMode
            ? 'bg-[#181818] border-[#2c2c2c] text-neutral-500'
            : 'bg-neutral-50 border-neutral-200 text-neutral-400'
        }`}
      >
        <span>Catalogo ufficiale iTunes & MusicBrainz</span>
        <span>1 clic per applicare</span>
      </div>
    </div>
  );
};
