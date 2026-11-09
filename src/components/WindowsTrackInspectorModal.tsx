import React, { useState, useRef } from 'react';
import { TrackMetadata, formatBytes, buildFilename } from '../services/mp3Tagger';
import {
  X,
  Play,
  Pause,
  Sparkles,
  Music,
  Disc3,
  Calendar,
  Check,
  Tag,
  ArrowLeftRight,
} from 'lucide-react';

interface WindowsTrackInspectorModalProps {
  track: TrackMetadata | null;
  isDarkMode: boolean;
  onClose: () => void;
  onSaveTrack: (updatedTrack: TrackMetadata) => void;
}

export const WindowsTrackInspectorModal: React.FC<WindowsTrackInspectorModalProps> = ({
  track,
  isDarkMode,
  onClose,
  onSaveTrack,
}) => {
  if (!track) return null;

  return (
    <InspectorModalInternal
      key={track.id}
      initialTrack={track}
      isDarkMode={isDarkMode}
      onClose={onClose}
      onSaveTrack={onSaveTrack}
    />
  );
};

const InspectorModalInternal: React.FC<{
  initialTrack: TrackMetadata;
  isDarkMode: boolean;
  onClose: () => void;
  onSaveTrack: (updatedTrack: TrackMetadata) => void;
}> = ({ initialTrack, isDarkMode, onClose, onSaveTrack }) => {
  const [formData, setFormData] = useState<TrackMetadata>({ ...initialTrack });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      const src = formData.processedUrl || URL.createObjectURL(formData.originalFile);
      const audio = new Audio(src);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  };

  const handleUpdateField = (updates: Partial<TrackMetadata>) => {
    setFormData((prev) => {
      const merged = { ...prev, ...updates };
      // If title, artist or featuring changed, update filename automatically
      if ('title' in updates || 'artist' in updates || 'featuring' in updates) {
        merged.suggestedFilename = buildFilename(merged.title, merged.artist, merged.featuring);
      }
      return merged;
    });
  };

  const handleSave = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const cleanSuggested = (formData.suggestedFilename || buildFilename(formData.title, formData.artist, formData.featuring)).replace(/[\[\]]/g, '');
    onSaveTrack({
      ...formData,
      title: formData.title.replace(/[\[\]]/g, '').trim(),
      artist: formData.artist.replace(/[\[\]]/g, '').trim(),
      featuring: (formData.featuring || '').replace(/[\[\]]/g, '').trim(),
      suggestedFilename: cleanSuggested,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1f1f1f] border-[#383838] text-[#e0e0e0]'
            : 'bg-[#ffffff] border-neutral-300 text-neutral-800'
        }`}
      >
        {/* Modal Titlebar */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b text-xs select-none ${
            isDarkMode ? 'bg-[#262626] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm">Proprietà Brano & Metadati</span>
            <span className="text-neutral-400 text-xs">({formatBytes(formData.fileSize)})</span>
          </div>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
          {/* Audio Player and Source */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#252525] border-[#363636]' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="text-xs min-w-0">
                <div className="font-semibold truncate text-neutral-800 dark:text-neutral-100">
                  {isPlaying ? 'Ascolto anteprima in corso...' : 'Ascolta traccia'}
                </div>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate max-w-[320px]">
                  {formData.originalFilename}
                </div>
              </div>
            </div>
            <Music className="w-5 h-5 text-neutral-400 shrink-0" />
          </div>

          {/* Form Fields for Metadata */}
          <div className="space-y-3 text-xs">
            {/* Suggested Filename */}
            <div className="space-y-1">
              <label className="font-semibold text-xs">
                Nome File Risultante
              </label>
              <input
                type="text"
                value={formData.suggestedFilename}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    suggestedFilename: e.target.value.replace(/[\[\]]/g, ''),
                  })
                }
                className={`w-full px-2.5 py-1.5 rounded border font-mono font-medium ${
                  isDarkMode
                    ? 'bg-[#252525] border-[#404040] text-emerald-400'
                    : 'bg-white border-neutral-300 text-emerald-700'
                }`}
              />
            </div>

            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Titolo Canzone</label>
                <button
                  type="button"
                  onClick={() => {
                    const newTitle = formData.artist;
                    const newArtist = formData.title;
                    handleUpdateField({ title: newTitle, artist: newArtist });
                  }}
                  className="text-[11px] text-sky-500 hover:text-sky-600 dark:text-sky-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Inverti con Artista</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleUpdateField({ title: e.target.value.replace(/[\[\]]/g, '') })}
                className={`w-full px-2.5 py-1.5 rounded border ${
                  isDarkMode ? 'bg-[#252525] border-[#404040]' : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            {/* Artist */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Artista Principale</label>
                {!formData.artist && (
                  <span className="text-[10px] text-red-500 font-medium">Mancante</span>
                )}
              </div>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => handleUpdateField({ artist: e.target.value.replace(/[\[\]]/g, '') })}
                placeholder=""
                className={`w-full px-2.5 py-1.5 rounded border ${
                  !formData.artist
                    ? 'border-red-500 bg-red-500/10 text-red-500 dark:bg-red-950/30 dark:border-red-500 dark:text-red-300'
                    : isDarkMode
                    ? 'bg-[#252525] border-[#404040]'
                    : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            {/* Featuring */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Featuring / Ospite</label>
                {formData.featuring && (
                  <span className="text-[10px] text-emerald-500 font-mono">
                    ID3: {formData.artist}; {formData.featuring}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formData.featuring}
                onChange={(e) => handleUpdateField({ featuring: e.target.value.replace(/[\[\]]/g, '') })}
                placeholder="Es: Pavè"
                className={`w-full px-2.5 py-1.5 rounded border ${
                  isDarkMode ? 'bg-[#252525] border-[#404040]' : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            {/* Album */}
            <div className="space-y-1">
              <label className="font-semibold flex items-center gap-1">
                <Disc3 className="w-3 h-3 text-blue-500" />
                <span>Nome Album</span>
              </label>
              <input
                type="text"
                value={formData.album}
                onChange={(e) => handleUpdateField({ album: e.target.value.replace(/[\[\]]/g, '') })}
                className={`w-full px-2.5 py-1.5 rounded border ${
                  isDarkMode ? 'bg-[#252525] border-[#404040]' : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Year */}
              <div className="space-y-1">
                <label className="font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  <span>Anno</span>
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => handleUpdateField({ year: e.target.value.trim() })}
                  placeholder="Es: 2016"
                  className={`w-full px-2.5 py-1.5 rounded border ${
                    isDarkMode ? 'bg-[#252525] border-[#404040]' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>

              {/* Genre */}
              <div className="space-y-1">
                <label className="font-semibold">Genere</label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => handleUpdateField({ genre: e.target.value })}
                  placeholder="Es: Pop, Rock"
                  className={`w-full px-2.5 py-1.5 rounded border ${
                    isDarkMode ? 'bg-[#252525] border-[#404040]' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`h-13 px-4 py-2 border-t flex items-center justify-end gap-2 select-none ${
            isDarkMode ? 'bg-[#242424] border-[#333333]' : 'bg-[#f4f5f7] border-neutral-200'
          }`}
        >
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className={`px-4 py-1.5 rounded text-xs border font-medium transition-colors ${
              isDarkMode
                ? 'bg-[#2c2c2c] border-[#404040] hover:bg-[#383838]'
                : 'bg-white border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            Annulla
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded text-xs bg-[#0067c0] hover:bg-[#1070c7] text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Salva e Applica Modifiche</span>
          </button>
        </div>
      </div>
    </div>
  );
};
