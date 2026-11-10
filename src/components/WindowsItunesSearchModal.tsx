import React, { useEffect, useState } from 'react';
import { Music, X, Check, Disc3, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { TrackMetadata } from '../services/mp3Tagger';
import { MusicCandidate } from './CandidatePickerDropdown';

interface TrackSearchResult {
  track: TrackMetadata;
  isLoading: boolean;
  hypothesis: MusicCandidate | null;
  selectedCandidate: MusicCandidate | null;
  isAmbiguous: boolean;
  ambiguityReason?: string;
  candidates: MusicCandidate[];
  error?: string;
}

interface WindowsItunesSearchModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  tracksToSearch: TrackMetadata[];
  onApplyResults: (selectedMap: Map<string, MusicCandidate>) => void;
  onCancel: () => void;
}

export const WindowsItunesSearchModal: React.FC<WindowsItunesSearchModalProps> = ({
  isOpen,
  isDarkMode,
  tracksToSearch,
  onApplyResults,
  onCancel,
}) => {
  const [results, setResults] = useState<Record<string, TrackSearchResult>>({});
  const [isProcessingSearch, setIsProcessingSearch] = useState<boolean>(false);

  // When modal opens, launch iTunes search for all tracks
  useEffect(() => {
    if (!isOpen || tracksToSearch.length === 0) {
      setResults({});
      return;
    }

    let isMounted = true;
    setIsProcessingSearch(true);

    const initialMap: Record<string, TrackSearchResult> = {};
    for (const t of tracksToSearch) {
      initialMap[t.id] = {
        track: t,
        isLoading: true,
        hypothesis: null,
        selectedCandidate: null,
        isAmbiguous: false,
        candidates: [],
      };
    }
    setResults(initialMap);

    const runSearch = async () => {
      for (const t of tracksToSearch) {
        try {
          const res = await fetch('/api/music-catalog-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: t.title, originalFilename: t.originalFilename }),
          });

          if (!isMounted) return;

          if (res.ok) {
            const data = await res.json();
            const candidates: MusicCandidate[] = data.candidates || [];
            const hypothesis: MusicCandidate | null = data.hypothesis || candidates[0] || null;
            const isAmbiguous: boolean = Boolean(data.isAmbiguous);

            setResults((prev) => ({
              ...prev,
              [t.id]: {
                track: t,
                isLoading: false,
                hypothesis,
                // Default selection is the hypothesis, unless ambiguous
                selectedCandidate: hypothesis,
                isAmbiguous,
                ambiguityReason: data.ambiguityReason,
                candidates,
              },
            }));
          } else {
            setResults((prev) => ({
              ...prev,
              [t.id]: {
                track: t,
                isLoading: false,
                hypothesis: null,
                selectedCandidate: null,
                isAmbiguous: false,
                candidates: [],
                error: 'Errore di risposta del catalogo',
              },
            }));
          }
        } catch (err: unknown) {
          if (!isMounted) return;
          const msg = err instanceof Error ? err.message : 'Errore di connessione';
          setResults((prev) => ({
            ...prev,
            [t.id]: {
              track: t,
              isLoading: false,
              hypothesis: null,
              selectedCandidate: null,
              isAmbiguous: false,
              candidates: [],
              error: msg,
            },
          }));
        }
      }

      if (isMounted) {
        setIsProcessingSearch(false);
      }
    };

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tracksToSearch]);

  if (!isOpen || tracksToSearch.length === 0) return null;

  const count = tracksToSearch.length;

  const handleSelectCandidateForTrack = (trackId: string, candidate: MusicCandidate) => {
    setResults((prev) => {
      const cur = prev[trackId];
      if (!cur) return prev;
      return {
        ...prev,
        [trackId]: {
          ...cur,
          selectedCandidate: candidate,
          // Once user explicitly chooses an option, it is resolved
          isAmbiguous: false,
        },
      };
    });
  };

  const handleConfirmAndApply = () => {
    const finalMap = new Map<string, MusicCandidate>();
    for (const t of tracksToSearch) {
      const item = results[t.id];
      if (item && item.selectedCandidate) {
        finalMap.set(t.id, item.selectedCandidate);
      }
    }
    onApplyResults(finalMap);
  };

  const hasAmbiguousPending = Object.values(results).some(
    (r) => r.isAmbiguous && !r.selectedCandidate
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1e1e1e] border-[#383838] text-[#e0e0e0]'
            : 'bg-[#ffffff] border-neutral-300 text-neutral-800'
        }`}
      >
        {/* Title Bar */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b text-xs shrink-0 ${
            isDarkMode ? 'bg-[#252525] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-rose-500/15 text-rose-500">
              <Music className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm">Ricerca Artista su iTunes & Catalogo Italiano</span>
          </div>

          <button
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-500/20 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Description */}
        <div className="p-4 pb-2 space-y-1 text-xs shrink-0 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <p className="font-semibold text-sm">
            Ipotesi cantante per {count === 1 ? 'il brano' : `${count} brani`}
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-[11px]">
            La ricerca privilegia il catalogo italiano (Rap / Trap / Musica Italiana) e formula
            un&apos;ipotesi automatica di cantante. Dovrai intervenire manualmente solo nei casi di
            omonimia o ambiguità.
          </p>
        </div>

        {/* Content: List of Tracks with Hypotheses and Candidates */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {tracksToSearch.map((track) => {
            const res = results[track.id];
            const isLoading = !res || res.isLoading;
            const hypothesis = res?.hypothesis;
            const selected = res?.selectedCandidate;
            const isAmbiguous = res?.isAmbiguous;
            const candidates = res?.candidates || [];

            return (
              <div
                key={track.id}
                className={`p-3 rounded-lg border transition-all ${
                  isAmbiguous
                    ? isDarkMode
                      ? 'bg-amber-950/15 border-amber-500/40'
                      : 'bg-amber-50/70 border-amber-300'
                    : isDarkMode
                    ? 'bg-[#181818] border-[#303030]'
                    : 'bg-[#fafafa] border-neutral-200'
                }`}
              >
                {/* Track Row Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      {track.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 ml-2 font-mono truncate">
                      {track.originalFilename}
                    </span>
                  </div>

                  {isLoading ? (
                    <span className="text-[10px] text-blue-500 flex items-center gap-1">
                      <Disc3 className="w-3 h-3 animate-spin" />
                      <span>Ricerca iTunes...</span>
                    </span>
                  ) : isAmbiguous ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Omonimia: scegli l&apos;artista</span>
                    </span>
                  ) : hypothesis ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Ipotesi definita</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-500/20 text-neutral-400">
                      Nessun riscontro
                    </span>
                  )}
                </div>

                {/* Hypothesized Singer Card (Unambiguous Case) */}
                {!isLoading && hypothesis && !isAmbiguous && (
                  <div
                    className={`p-2.5 rounded-md flex items-center gap-3 border ${
                      isDarkMode
                        ? 'bg-[#222222] border-[#383838]'
                        : 'bg-white border-neutral-200 shadow-2xs'
                    }`}
                  >
                    {/* Artwork */}
                    <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-neutral-900 border border-neutral-700/50 flex items-center justify-center">
                      {hypothesis.artworkUrl ? (
                        <img
                          src={hypothesis.artworkUrl}
                          alt={hypothesis.artist}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 text-[10px]">Ipotesi cantante:</span>
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                          {hypothesis.artist}
                        </span>
                        {hypothesis.featuring && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            Feat. {hypothesis.featuring}
                          </span>
                        )}
                        {hypothesis.isRapOrHipHop && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                            Rap ITA
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {hypothesis.album ? `Album: ${hypothesis.album}` : 'Singolo'}
                        {hypothesis.year ? ` (${hypothesis.year})` : ''} · {hypothesis.genre || 'Catalogo Ufficiale'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ambiguity / Omonimia Options Picker (User intervention required) */}
                {!isLoading && isAmbiguous && candidates.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">
                      Trovate più canzoni con lo stesso titolo o artisti diversi. Seleziona l&apos;artista corretto con un clic:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {candidates.slice(0, 4).map((cand) => {
                        const isChosen = selected?.id === cand.id;
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleSelectCandidateForTrack(track.id, cand)}
                            className={`p-2 rounded-md border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isChosen
                                ? 'border-blue-500 bg-blue-500/10 text-blue-500 dark:bg-blue-950/30 dark:border-blue-500'
                                : isDarkMode
                                ? 'bg-[#222222] border-[#383838] hover:bg-[#282828] text-neutral-200'
                                : 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <div className="w-7 h-7 rounded shrink-0 overflow-hidden bg-neutral-900 border border-neutral-700/50 flex items-center justify-center">
                              {cand.artworkUrl ? (
                                <img
                                  src={cand.artworkUrl}
                                  alt={cand.artist}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs truncate">
                                {cand.artist}
                              </div>
                              <div className="text-[9px] text-neutral-400 truncate">
                                {cand.featuring ? `Feat. ${cand.featuring} · ` : ''}
                                {cand.album || cand.genre || 'Singolo'}
                              </div>
                            </div>
                            {isChosen && (
                              <Check className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State / Not Found */}
                {!isLoading && !hypothesis && (
                  <p className="text-[11px] text-neutral-500 italic py-1">
                    Nessun brano corrispondente trovato nel catalogo. Il campo rimarrà vuoto per la modifica manuale.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`h-13 px-4 py-2 border-t flex items-center justify-between select-none text-xs shrink-0 ${
            isDarkMode ? 'bg-[#242424] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="text-[11px] text-neutral-400">
            {isProcessingSearch ? 'Ricerca in corso...' : 'Catalogo ufficiale iTunes (Italia)'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
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
              onClick={handleConfirmAndApply}
              disabled={isProcessingSearch}
              className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1070c7] active:bg-[#005fb8] disabled:opacity-50 text-white font-semibold rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Conferma e Applica</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
