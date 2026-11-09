import React, { useRef, useState } from 'react';
import {
  FileAudio,
  FolderOpen,
  Sparkles,
  Trash2,
  Terminal,
  FilePlus2,
  ArrowLeftRight,
  Users,
  Archive,
  ChevronDown,
  Check,
  FileDown,
  Loader2,
} from 'lucide-react';

interface WindowsCommandBarProps {
  isDarkMode: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onStartBatchAi: () => void;
  onSwapAllTitleArtist: () => void;
  onDownloadAllZip: () => void;
  onClearAll: () => void;
  onAddSampleFiles: () => void;
  isProcessingAi: boolean;
  canDownloadZip: boolean;
  totalTracks: number;
  selectedCount: number;
  artistCount: number;
  onOpenArtistManager: () => void;
  isLogOpen: boolean;
  onToggleLog: () => void;
  downloadMode?: 'auto' | 'direct' | 'zip';
  onChangeDownloadMode?: (mode: 'auto' | 'direct' | 'zip') => void;
  onSmartDownload?: () => void;
  isDownloading?: boolean;
}

export const WindowsCommandBar: React.FC<WindowsCommandBarProps> = ({
  isDarkMode,
  onFilesSelected,
  onStartBatchAi,
  onSwapAllTitleArtist,
  onDownloadAllZip,
  onClearAll,
  onAddSampleFiles,
  isProcessingAi,
  canDownloadZip,
  totalTracks,
  selectedCount,
  artistCount,
  onOpenArtistManager,
  isLogOpen,
  onToggleLog,
  downloadMode = 'auto',
  onChangeDownloadMode,
  onSmartDownload,
  isDownloading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 select-none text-xs transition-colors ${
        isDarkMode
          ? 'bg-[#252525] border-[#333333] text-[#e1e1e1]'
          : 'bg-[#fafafa] border-[#e5e5e5] text-[#333333]'
      }`}
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".mp3,audio/mpeg,audio/mp3"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileChange}
        // @ts-expect-error webkitdirectory is standard in browsers but not typed in react standard HTMLInputElement
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />

      {/* Left Actions Group */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Add Files Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingAi}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium border transition-colors shadow-2xs ${
            isDarkMode
              ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#404040] text-neutral-100 disabled:opacity-50'
              : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 disabled:opacity-50'
          }`}
          title="Seleziona file MP3 dal computer"
        >
          <FileAudio className="w-3.5 h-3.5 text-blue-500" />
          <span>Aggiungi File</span>
        </button>

        {/* Add Folder Button */}
        <button
          onClick={() => folderInputRef.current?.click()}
          disabled={isProcessingAi}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium border transition-colors shadow-2xs ${
            isDarkMode
              ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#404040] text-neutral-200 disabled:opacity-50'
              : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700 disabled:opacity-50'
          }`}
          title="Carica una cartella di brani"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          <span>Cartella</span>
        </button>

        {/* Add Samples */}
        <button
          onClick={onAddSampleFiles}
          disabled={isProcessingAi}
          className={`px-2 py-1.5 rounded flex items-center gap-1.5 text-xs border transition-colors ${
            isDarkMode
              ? 'bg-[#222222] hover:bg-[#2b2b2b] border-[#383838] text-neutral-300'
              : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
          }`}
          title="Carica brani di prova"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Demo</span>
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-0.5" />

        {/* Quick Swap Title <-> Artist Button */}
        <button
          onClick={onSwapAllTitleArtist}
          disabled={totalTracks === 0 || isProcessingAi}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium border transition-colors shadow-2xs ${
            totalTracks > 0 && !isProcessingAi
              ? isDarkMode
                ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#404040] text-sky-300'
                : 'bg-white hover:bg-sky-50 border-neutral-300 text-sky-700'
              : 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-neutral-700'
          }`}
          title={
            selectedCount > 0
              ? `Inverti Titolo ⇄ Artista per i ${selectedCount} brani selezionati`
              : 'Inverti Titolo ⇄ Artista per tutti i brani'
          }
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" />
          <span>
            {selectedCount > 0
              ? `Inverti (${selectedCount})`
              : 'Inverti Titolo/Artista'}
          </span>
        </button>

        {/* Batch AI Refinement Button */}
        <button
          onClick={onStartBatchAi}
          disabled={isProcessingAi || totalTracks === 0}
          className={`px-3.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold shadow-xs transition-all ${
            isProcessingAi || totalTracks === 0
              ? 'opacity-50 cursor-not-allowed bg-neutral-400 text-white'
              : 'bg-[#0067c0] hover:bg-[#1070c7] active:bg-[#005fb8] text-white'
          }`}
          title="Perfeziona i metadati dei brani con AI"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isProcessingAi ? 'animate-spin' : ''}`} />
          <span>{isProcessingAi ? 'Rifinitura in corso...' : 'Rifinisci con AI'}</span>
        </button>

        {/* Smart Download (Direct MP3s for 1-4 songs, ZIP for heavy folders > 4) */}
        <div className="relative inline-flex items-stretch rounded shadow-2xs">
          <button
            onClick={() => {
              if (onSmartDownload) {
                onSmartDownload();
              } else {
                onDownloadAllZip();
              }
            }}
            disabled={!canDownloadZip || isDownloading}
            className={`px-3 py-1.5 rounded-l flex items-center gap-1.5 font-semibold border border-r-0 transition-colors ${
              canDownloadZip && !isDownloading
                ? isDarkMode
                  ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100'
                : 'opacity-40 cursor-not-allowed border-neutral-300 dark:border-neutral-700'
            }`}
            title={
              (downloadMode === 'direct' || (downloadMode === 'auto' && totalTracks <= 4))
                ? `Download diretto di ${totalTracks} file MP3 con tag ID3 verificati (senza archivio ZIP)`
                : `Download archivio ZIP con ${totalTracks} brani e tag ID3 completi (consigliato per cartelle pesanti)`
            }
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                <span>Download...</span>
              </>
            ) : (downloadMode === 'direct' || (downloadMode === 'auto' && totalTracks <= 4)) ? (
              <>
                <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {totalTracks <= 1
                    ? 'Scarica MP3'
                    : `Scarica MP3 (${totalTracks})`}
                </span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {totalTracks <= 1
                    ? 'Scarica ZIP'
                    : `Scarica ZIP (${totalTracks})`}
                </span>
              </>
            )}
          </button>

          {/* Mode Dropdown Selector */}
          <button
            onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
            disabled={!canDownloadZip || isDownloading}
            className={`px-1.5 py-1.5 rounded-r border border-l transition-colors flex items-center justify-center ${
              canDownloadZip && !isDownloading
                ? isDarkMode
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80 border-l-emerald-700/60'
                  : 'bg-emerald-100 border-emerald-400 text-emerald-700 hover:bg-emerald-200 border-l-emerald-300'
                : 'opacity-40 cursor-not-allowed border-neutral-300 dark:border-neutral-700'
            }`}
            title="Opzioni formato di download (Automatico, MP3 singoli o ZIP)"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Download Options Menu */}
          {isDownloadMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsDownloadMenuOpen(false)}
              />
              <div
                className={`absolute left-0 top-full mt-1 w-52 rounded-lg shadow-lg border z-40 p-1 text-xs select-none ${
                  isDarkMode
                    ? 'bg-[#222222] border-[#383838] text-neutral-200'
                    : 'bg-white border-neutral-200 text-neutral-800'
                }`}
              >
                {/* Auto Mode */}
                <button
                  onClick={() => {
                    onChangeDownloadMode?.('auto');
                    setIsDownloadMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                    downloadMode === 'auto'
                      ? isDarkMode
                        ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                        : 'bg-emerald-50 text-emerald-700 font-medium'
                      : isDarkMode
                      ? 'hover:bg-[#2d2d2d] text-neutral-300'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Automatico</span>
                  </div>
                  {downloadMode === 'auto' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>

                {/* Direct MP3 Mode */}
                <button
                  onClick={() => {
                    onChangeDownloadMode?.('direct');
                    setIsDownloadMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                    downloadMode === 'direct'
                      ? isDarkMode
                        ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                        : 'bg-emerald-50 text-emerald-700 font-medium'
                      : isDarkMode
                      ? 'hover:bg-[#2d2d2d] text-neutral-300'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>File MP3 singoli</span>
                  </div>
                  {downloadMode === 'direct' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>

                {/* ZIP Mode */}
                <button
                  onClick={() => {
                    onChangeDownloadMode?.('zip');
                    setIsDownloadMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                    downloadMode === 'zip'
                      ? isDarkMode
                        ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                        : 'bg-emerald-50 text-emerald-700 font-medium'
                      : isDarkMode
                      ? 'hover:bg-[#2d2d2d] text-neutral-300'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Archivio ZIP</span>
                  </div>
                  {downloadMode === 'zip' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Clear List */}
        {totalTracks > 0 && (
          <button
            onClick={onClearAll}
            disabled={isProcessingAi}
            className={`px-2 py-1.5 rounded flex items-center gap-1 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors ${
              isProcessingAi ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title="Svuota l'elenco dei file"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota</span>
          </button>
        )}
      </div>

      {/* Right Group: Artists Dictionary & Error Log */}
      <div className="flex items-center gap-1.5">
        {/* Cantanti Noti Button */}
        <button
          onClick={onOpenArtistManager}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 border transition-colors shadow-2xs ${
            isDarkMode
              ? 'bg-[#292929] hover:bg-[#333333] border-[#404040] text-neutral-200'
              : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
          }`}
          title="Gestisci cantanti noti nel database"
        >
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span>Cantanti ({artistCount})</span>
        </button>

        {/* Toggle Windows Event/Error Log */}
        <button
          onClick={onToggleLog}
          className={`px-2 py-1.5 rounded flex items-center gap-1.5 border transition-colors ${
            isLogOpen
              ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : isDarkMode
              ? 'bg-[#2d2d2d] border-[#3d3d3d] text-neutral-300 hover:bg-[#383838]'
              : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Mostra / nascondi registro eventi"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Registro</span>
        </button>
      </div>
    </div>
  );
};
