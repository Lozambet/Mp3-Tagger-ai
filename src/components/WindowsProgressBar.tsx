import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface WindowsProgressBarProps {
  isDarkMode: boolean;
  isProcessing: boolean;
  total: number;
  completed: number;
  currentFilename?: string;
  currentStep?: string;
}

export const WindowsProgressBar: React.FC<WindowsProgressBarProps> = ({
  isDarkMode,
  isProcessing,
  total,
  completed,
  currentFilename,
  currentStep,
}) => {
  if (!isProcessing && completed === 0) return null;

  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const isDone = completed >= total && total > 0;

  return (
    <div
      className={`px-4 py-2.5 border-b select-none transition-all ${
        isDarkMode
          ? 'bg-[#1f1f1f] border-[#2e2e2e] text-[#e0e0e0]'
          : 'bg-[#f0f4f9] border-[#d8e2ed] text-[#1a202c]'
      }`}
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className="font-semibold">
            {isProcessing ? 'Elaborazione in corso' : 'Elaborazione completata'}
          </span>
          {currentFilename && isProcessing && (
            <span
              className={`truncate max-w-xs md:max-w-md ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              • {currentFilename} ({currentStep || 'in lavorazione'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="font-medium text-blue-600 dark:text-blue-400">{percent}%</span>
          <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
            ({completed} di {total} file)
          </span>
        </div>
      </div>

      {/* Windows 11 Fluent style Progress Bar */}
      <div
        className={`w-full h-1.5 rounded-full overflow-hidden relative ${
          isDarkMode ? 'bg-[#333333]' : 'bg-[#d8e2ed]'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            isDone
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-blue-600 via-sky-400 to-blue-500 shadow-sm'
          }`}
          style={{ width: `${percent}%` }}
        />
        {isProcessing && percent < 100 && (
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};
