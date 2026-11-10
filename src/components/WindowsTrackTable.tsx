import React, { useState, useRef } from 'react';
import {
  TrackMetadata,
  formatBytes,
  downloadFile,
  buildFilename,
} from '../services/mp3Tagger';
import {
  Play,
  Pause,
  Download,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
  FileAudio,
  UploadCloud,
  FilePlus2,
  ArrowLeftRight,
  Search,
  Music,
  ChevronDown,
} from 'lucide-react';
import { CandidatePickerDropdown, MusicCandidate } from './CandidatePickerDropdown';

interface WindowsTrackTableProps {
  tracks: TrackMetadata[];
  isDarkMode: boolean;
  onUpdateTrack: (id: string, updates: Partial<TrackMetadata>) => void;
  onRemoveTrack: (id: string) => void;
  onInspectTrack: (track: TrackMetadata) => void;
  onRefineSingleTrack?: (track: TrackMetadata) => void;
  onSwapTitleArtist: (id: string) => void;
  onDropFiles: (files: FileList | File[]) => void;
  onAddSampleFiles: () => void;
  isProcessing: boolean;
  selectedTrackIds: Set<string>;
  onToggleSelectTrack: (id: string) => void;
  onToggleSelectAll: () => void;
  onDownloadSingleTrack?: (track: TrackMetadata) => void;
  onRequestSearchArtist?: (track: TrackMetadata) => void;
  onSelectCatalogCandidate?: (track: TrackMetadata, candidate: MusicCandidate) => void;
}

export const WindowsTrackTable: React.FC<WindowsTrackTableProps> = ({
  tracks,
  isDarkMode,
  onUpdateTrack,
  onRemoveTrack,
  onInspectTrack,
  onSwapTitleArtist,
  onDropFiles,
  onAddSampleFiles,
  isProcessing,
  selectedTrackIds,
  onToggleSelectTrack,
  onToggleSelectAll,
  onDownloadSingleTrack,
  onRequestSearchArtist,
  onSelectCatalogCandidate,
}) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Music Catalog Candidates state
  const [activeCandidateTrackId, setActiveCandidateTrackId] = useState<string | null>(null);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, MusicCandidate[]>>({});
  const [loadingCandidatesMap, setLoadingCandidatesMap] = useState<Record<string, boolean>>({});

  const handleOpenCandidatePicker = async (track: TrackMetadata) => {
    if (activeCandidateTrackId === track.id) {
      setActiveCandidateTrackId(null);
      return;
    }
    setActiveCandidateTrackId(track.id);

    if (!candidatesMap[track.id]) {
      setLoadingCandidatesMap((prev) => ({ ...prev, [track.id]: true }));
      try {
        const res = await fetch('/api/music-catalog-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: track.title, originalFilename: track.originalFilename }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.candidates)) {
            setCandidatesMap((prev) => ({ ...prev, [track.id]: data.candidates }));
          }
        }
      } catch (err) {
        console.warn('Error fetching candidates:', err);
      } finally {
        setLoadingCandidatesMap((prev) => ({ ...prev, [track.id]: false }));
      }
    }
  };

  const handleSelectCandidate = (track: TrackMetadata, cand: MusicCandidate) => {
    const newFilename = buildFilename(track.title, cand.artist, cand.featuring);
    onUpdateTrack(track.id, {
      artist: cand.artist,
      featuring: cand.featuring,
      album: track.album || cand.album,
      year: track.year || cand.year,
      suggestedFilename: newFilename,
    });
    if (onSelectCatalogCandidate) {
      onSelectCatalogCandidate(track, cand);
    }
    setActiveCandidateTrackId(null);
  };

  // Audio preview toggle
  const togglePlayAudio = (track: TrackMetadata) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioUrl = track.processedUrl || URL.createObjectURL(track.originalFile);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
      audio.play().catch((err) => {
        console.warn('Audio preview playback error:', err);
        setPlayingTrackId(null);
      });
      audio.onended = () => setPlayingTrackId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  if (tracks.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 flex flex-col items-center justify-center p-8 m-4 border border-dashed rounded-xl transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : isDarkMode
            ? 'border-[#333333] bg-[#1a1a1a]/40'
            : 'border-neutral-300 bg-white/60'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h3 className="text-sm font-semibold mb-1 text-neutral-800 dark:text-neutral-100">
          Trascina qui i file MP3
        </h3>
        <p className="text-xs text-neutral-400 mb-5 text-center">
          Rinomina e correggi i metadati istantaneamente
        </p>

        <div className="flex items-center gap-2.5">
          <label className="cursor-pointer px-3.5 py-1.5 rounded-md bg-[#0067c0] hover:bg-[#1070c7] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors">
            <FileAudio className="w-3.5 h-3.5" />
            <span>Sfoglia file</span>
            <input
              type="file"
              multiple
              accept=".mp3,audio/mpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onDropFiles(e.target.files);
              }}
            />
          </label>

          <button
            onClick={onAddSampleFiles}
            className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isDarkMode
                ? 'bg-[#252525] hover:bg-[#303030] border-[#383838] text-neutral-300'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Carica demo</span>
          </button>
        </div>
      </div>
    );
  }

  const allSelected = tracks.length > 0 && selectedTrackIds.size === tracks.length;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col overflow-hidden relative select-text"
    >
      {/* Floating Drag Overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-30 bg-blue-600/10 backdrop-blur-xs border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-neutral-800 px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-4 h-4 animate-bounce" />
            <span>Rilascia i file MP3</span>
          </div>
        </div>
      )}

      {/* Clean Table Header */}
      <div
        className={`grid grid-cols-[36px_minmax(180px,1.4fr)_34px_minmax(180px,1.4fr)_minmax(220px,2fr)_110px] items-center text-xs font-medium px-3 py-2 border-b select-none ${
          isDarkMode
            ? 'bg-[#1e1e1e] border-[#2d2d2d] text-neutral-400'
            : 'bg-[#f5f5f5] border-neutral-200 text-neutral-600'
        }`}
      >
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="rounded border-neutral-400 text-blue-600 focus:ring-0 cursor-pointer"
            title="Seleziona tutti"
          />
        </div>
        <div>Titolo Canzone</div>
        <div className="text-center" title="Scambia Titolo e Artista">
          ⇄
        </div>
        <div>Artista / Feat</div>
        <div>Nome File Risultante</div>
        <div className="text-right pr-2">Azioni</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
        {tracks.map((track) => {
          const isSelected = selectedTrackIds.has(track.id);
          const isPlaying = playingTrackId === track.id;
          const formattedFilename =
            track.suggestedFilename || buildFilename(track.title, track.artist, track.featuring);

          return (
            <div
              key={track.id}
              className={`grid grid-cols-[36px_minmax(180px,1.4fr)_34px_minmax(180px,1.4fr)_minmax(220px,2fr)_110px] items-center text-xs px-3 py-1.5 transition-colors ${
                isSelected
                  ? isDarkMode
                    ? 'bg-blue-950/20 hover:bg-blue-950/30'
                    : 'bg-blue-50/50 hover:bg-blue-100/50'
                  : isDarkMode
                  ? 'bg-[#181818] hover:bg-[#202020]'
                  : 'bg-white hover:bg-neutral-50/80'
              }`}
            >
              {/* Checkbox */}
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelectTrack(track.id)}
                  className="rounded border-neutral-400 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Title Input + Quiet original filename subtext */}
              <div className="pr-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={track.title}
                    onChange={(e) => {
                      const cleanTitle = e.target.value.replace(/[\[\]]/g, '');
                      onUpdateTrack(track.id, { title: cleanTitle });
                    }}
                    className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                      isDarkMode
                        ? 'bg-[#222222] border-[#383838] text-neutral-200 focus:border-blue-500'
                        : 'bg-white border-neutral-300 text-neutral-800 focus:border-blue-500'
                    }`}
                    placeholder="Nome canzone"
                  />
                  {track.status === 'analyzing' && (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                  )}
                  {track.status === 'error' && (
                    <span title={track.errorMessage || 'Errore'} className="shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    </span>
                  )}
                </div>
                <div
                  className="text-[10px] text-neutral-400 font-mono truncate px-1 mt-0.5"
                  title={track.originalFilename}
                >
                  {track.originalFilename} · {formatBytes(track.fileSize)}
                </div>
              </div>

              {/* Quick Switch Button (⇄) */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onSwapTitleArtist(track.id)}
                  title="Inverti Titolo ⇄ Artista"
                  className={`p-1 rounded border transition-colors ${
                    isDarkMode
                      ? 'bg-[#222222] hover:bg-[#2e2e2e] border-[#383838] text-neutral-300'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3 text-sky-500" />
                </button>
              </div>

              {/* Artist Input */}
              <div className="px-1 min-w-0">
                {(() => {
                  const isArtistMissing = !track.artist || track.artist.trim() === '';
                  return (
                    <>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={track.featuring ? `${track.artist} Feat. ${track.featuring}` : track.artist}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/[\[\]]/g, '');
                            const ftMatch = cleanVal.match(/(?:feat\.?|ft\.?)\s*(.*)/i);
                            if (ftMatch) {
                              const cleanArtist = cleanVal.replace(ftMatch[0], '').trim();
                              onUpdateTrack(track.id, { artist: cleanArtist, featuring: ftMatch[1].trim() });
                            } else if (cleanVal.includes(';')) {
                              const parts = cleanVal.split(';').map((s) => s.trim()).filter(Boolean);
                              onUpdateTrack(track.id, {
                                artist: parts[0] || cleanVal,
                                featuring: parts.slice(1).join(', '),
                              });
                            } else {
                              onUpdateTrack(track.id, { artist: cleanVal });
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                            isArtistMissing
                              ? 'border-red-500 bg-red-500/10 text-red-500 dark:bg-red-950/30 dark:border-red-500 dark:text-red-300 focus:border-red-600 focus:ring-1 focus:ring-red-500 pr-7'
                              : isDarkMode
                              ? 'bg-[#222222] border-[#383838] text-neutral-200 focus:border-blue-500'
                              : 'bg-white border-neutral-300 text-neutral-800 focus:border-blue-500'
                          }`}
                          placeholder={isArtistMissing ? '' : 'Artista'}
                          title={
                            isArtistMissing
                              ? 'Artista mancante. Clicca su "Scegli" per selezionare dal catalogo ufficiale iTunes & MusicBrainz.'
                              : track.featuring
                              ? `Artista: ${track.artist} | Tag ID3: ${track.artist}; ${track.featuring}`
                              : `Artista: ${track.artist}`
                          }
                        />
                        {isArtistMissing && (
                          <button
                            type="button"
                            onClick={() => (onRequestSearchArtist ? onRequestSearchArtist(track) : handleOpenCandidatePicker(track))}
                            title="Identifica artista su iTunes (Italia)"
                            className="absolute right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 dark:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Music className="w-2.5 h-2.5" />
                            <span>iTunes</span>
                          </button>
                        )}

                        {/* Candidate Picker Dropdown Menu */}
                        <CandidatePickerDropdown
                          isOpen={activeCandidateTrackId === track.id}
                          isLoading={Boolean(loadingCandidatesMap[track.id])}
                          candidates={candidatesMap[track.id] || []}
                          trackTitle={track.title}
                          isDarkMode={isDarkMode}
                          onSelectCandidate={(cand) => handleSelectCandidate(track, cand)}
                          onClose={() => setActiveCandidateTrackId(null)}
                        />
                      </div>
                      {track.album && (
                        <div className="text-[10px] text-neutral-400 truncate px-1 mt-0.5">
                          Album: {track.album}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Clean Output Filename Preview */}
              <div className="px-1 min-w-0">
                <input
                  type="text"
                  value={formattedFilename}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[\[\]]/g, '');
                    onUpdateTrack(track.id, { suggestedFilename: cleanVal });
                  }}
                  className={`w-full px-2 py-1 text-xs font-mono rounded border transition-colors ${
                    isDarkMode
                      ? 'bg-[#1f1f1f] border-[#333333] text-emerald-400 focus:border-emerald-500'
                      : 'bg-neutral-50/70 border-neutral-200 text-emerald-700 focus:border-emerald-500'
                  }`}
                  title="Nome del file finale"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-1">
                {/* Audio preview */}
                <button
                  onClick={() => togglePlayAudio(track)}
                  title={isPlaying ? 'Pausa' : 'Ascolta anteprima'}
                  className={`p-1.5 rounded transition-colors ${
                    isPlaying
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                      ? 'hover:bg-[#2d2d2d] text-neutral-400 hover:text-neutral-200'
                      : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>

                {/* Inspect / Properties */}
                <button
                  onClick={() => onInspectTrack(track)}
                  title="Modifica dettagli (Album, Anno, ecc.)"
                  className={`p-1.5 rounded transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#2d2d2d] text-neutral-400 hover:text-neutral-200'
                      : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>

                {/* Download Single MP3 */}
                <button
                  onClick={() => {
                    if (onDownloadSingleTrack) {
                      onDownloadSingleTrack(track);
                    } else if (track.processedBlob) {
                      downloadFile(track.processedBlob, formattedFilename);
                    }
                  }}
                  disabled={isProcessing}
                  title="Scarica questo MP3"
                  className="p-1.5 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                </button>

                {/* Remove */}
                <button
                  onClick={() => onRemoveTrack(track.id)}
                  disabled={isProcessing}
                  title="Rimuovi"
                  className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
