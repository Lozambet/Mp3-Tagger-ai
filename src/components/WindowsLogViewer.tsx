import React, { useState } from 'react';
import { LogEntry } from '../services/mp3Tagger';
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  Download,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';

interface WindowsLogViewerProps {
  logs: LogEntry[];
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onClearLogs: () => void;
}

export const WindowsLogViewer: React.FC<WindowsLogViewerProps> = ({
  logs,
  isDarkMode,
  isOpen,
  onClose,
  onClearLogs,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (activeFilter === 'all') return true;
    return log.type === activeFilter;
  });

  const errorCount = logs.filter((l) => l.type === 'error').length;
  const warningCount = logs.filter((l) => l.type === 'warning').length;
  const successCount = logs.filter((l) => l.type === 'success').length;

  const handleCopy = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.file ? `[${l.file}] ` : ''}${l.message}${
            l.details ? `\n  Dettagli: ${l.details}` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.file ? `[${l.file}] ` : ''}${l.message}${
            l.details ? `\n  Dettagli: ${l.details}` : ''
          }`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Windows_MP3_Tagger_Logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`border-t flex flex-col transition-all z-20 ${
        isExpanded ? 'h-96' : 'h-48'
      } ${
        isDarkMode
          ? 'bg-[#181818] border-[#303030] text-[#e0e0e0]'
          : 'bg-[#f8f9fa] border-neutral-300 text-neutral-800'
      }`}
    >
      {/* Log Header Toolbar */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between border-b text-xs select-none ${
          isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-[#eaecee] border-neutral-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-semibold tracking-tight">Registro Attività ed Errori di Sistema</span>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 ml-3">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Tutti ({logs.length})
            </button>
            <button
              onClick={() => setActiveFilter('error')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                activeFilter === 'error'
                  ? 'bg-red-600 text-white font-medium'
                  : errorCount > 0
                  ? 'text-red-500 font-medium hover:bg-red-500/10'
                  : 'text-neutral-500 hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              Errori ({errorCount})
            </button>
            <button
              onClick={() => setActiveFilter('warning')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                activeFilter === 'warning'
                  ? 'bg-amber-600 text-white font-medium'
                  : warningCount > 0
                  ? 'text-amber-500 hover:bg-amber-500/10'
                  : 'text-neutral-500 hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Avvisi ({warningCount})
            </button>
            <button
              onClick={() => setActiveFilter('success')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                activeFilter === 'success'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-neutral-500 hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Successi ({successCount})
            </button>
          </div>
        </div>

        {/* Log Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Copia l'intero registro negli appunti"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Salva il registro come file .txt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearLogs}
            className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Cancella registro"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title={isExpanded ? 'Riduci' : 'Espandi'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
            title="Chiudi pannello registro"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Console Content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed select-text space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-neutral-400 dark:text-neutral-500 italic p-3 text-center">
            Nessun evento registrato in questa categoria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            let IconComponent = Info;

            if (log.type === 'error') {
              badgeColor = 'text-red-500 bg-red-500/10 border-red-500/30';
              IconComponent = AlertCircle;
            } else if (log.type === 'warning') {
              badgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
              IconComponent = AlertTriangle;
            } else if (log.type === 'success') {
              badgeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
              IconComponent = CheckCircle2;
            }

            return (
              <div
                key={log.id}
                className={`p-1.5 rounded border transition-colors ${
                  log.type === 'error'
                    ? isDarkMode
                      ? 'bg-red-950/20 border-red-900/40'
                      : 'bg-red-50 border-red-200'
                    : isDarkMode
                    ? 'bg-[#1e1e1e] border-[#292929]'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-neutral-400 shrink-0 text-[10px] pt-0.5">[{log.timestamp}]</span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-semibold uppercase tracking-wider shrink-0 ${badgeColor}`}
                  >
                    <IconComponent className="w-2.5 h-2.5" />
                    {log.type}
                  </span>
                  {log.file && (
                    <span className="px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-medium shrink-0 truncate max-w-[200px]">
                      {log.file}
                    </span>
                  )}
                  <span className="text-neutral-800 dark:text-neutral-200 flex-1 break-words">
                    {log.message}
                  </span>
                </div>
                {log.details && (
                  <div className="mt-1 pl-16 text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap font-sans bg-black/5 dark:bg-white/5 p-1 rounded">
                    {log.details}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
