import React from 'react';
import { formatBytes } from '../services/mp3Tagger';
import { AlertCircle } from 'lucide-react';

interface WindowsStatusBarProps {
  isDarkMode: boolean;
  totalTracks: number;
  selectedCount: number;
  totalBytes: number;
  completedCount?: number;
  errorCount: number;
  artistCount?: number;
  isLogOpen: boolean;
  onToggleLog: () => void;
}

export const WindowsStatusBar: React.FC<WindowsStatusBarProps> = ({
  isDarkMode,
  totalTracks,
  selectedCount,
  totalBytes,
  errorCount,
  isLogOpen,
  onToggleLog,
}) => {
  return (
    <footer
      className={`h-6 px-3 flex items-center justify-between text-[11px] border-t select-none transition-colors ${
        isDarkMode
          ? 'bg-[#181818] border-[#292929] text-neutral-400'
          : 'bg-[#f5f5f5] border-neutral-200 text-neutral-500'
      }`}
    >
      {/* Left: Summary */}
      <div className="flex items-center gap-2">
        <span>
          {totalTracks} {totalTracks === 1 ? 'brano' : 'brani'}
          {totalBytes > 0 ? ` · ${formatBytes(totalBytes)}` : ''}
        </span>

        {selectedCount > 0 && (
          <span className="text-blue-500 font-medium">
            · {selectedCount} selezionat{selectedCount === 1 ? 'o' : 'i'}
          </span>
        )}

        {errorCount > 0 && (
          <button
            onClick={onToggleLog}
            className="flex items-center gap-1 text-red-500 font-medium hover:underline cursor-pointer ml-1"
          >
            <AlertCircle className="w-3 h-3" />
            <span>{errorCount} {errorCount === 1 ? 'errore' : 'errori'}</span>
          </button>
        )}
      </div>

      {/* Right: Clean quiet Log toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLog}
          className={`hover:underline cursor-pointer ${
            isLogOpen ? 'text-blue-500 font-medium' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          {isLogOpen ? 'Chiudi Registro' : 'Registro'}
        </button>
      </div>
    </footer>
  );
};
