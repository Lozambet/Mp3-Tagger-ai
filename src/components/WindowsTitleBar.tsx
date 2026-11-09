import React, { useState } from 'react';
import { Minus, Square, Copy, Moon, Sun, Music, LogIn, LogOut, User as UserIcon, Sparkles, X } from 'lucide-react';
import type { User } from 'firebase/auth';

interface WindowsTitleBarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  trackCount: number;
  artistCount?: number;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  isDarkMode,
  onToggleDarkMode,
  trackCount,
  artistCount,
  currentUser,
  onSignIn,
  onSignOut,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 2200);
  };

  return (
    <header
      className={`h-10 select-none flex items-center justify-between px-3 text-xs border-b transition-colors ${
        isDarkMode
          ? 'bg-[#1e1e1e] border-[#2d2d2d] text-[#e0e0e0]'
          : 'bg-[#f3f3f3] border-[#e5e5e5] text-[#202020]'
      }`}
    >
      {/* Left: App Logo & Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-sm">
          <Music className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="tracking-tight font-semibold">MP3 Tagger</span>
          {trackCount > 0 && (
            <span className={`text-[11px] font-normal ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              · {trackCount} {trackCount === 1 ? 'brano' : 'brani'}
            </span>
          )}
        </div>
      </div>

      {/* Center: System Alert/Toast if any */}
      {notification && (
        <div className="animate-fade-in text-[11px] px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> {notification}
        </div>
      )}

      {/* Right: User account, Theme Toggle & Windows 11 Window Controls */}
      <div className="flex items-center gap-1.5">
        {/* User Account / Google Sign-in */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-300">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="text-[11px] font-medium max-w-[100px] truncate" title={currentUser.email || ''}>
              {currentUser.displayName || currentUser.email?.split('@')[0]}
            </span>
            <button
              onClick={onSignOut}
              title="Disconnetti account"
              className="text-neutral-400 hover:text-red-400 transition-colors p-0.5"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : onSignIn ? (
          <button
            onClick={onSignIn}
            title="Accedi con Google (Firebase Auth)"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-600/40 hover:bg-neutral-500/10 text-[11px] text-neutral-300 transition-colors"
          >
            <LogIn className="w-3 h-3 text-blue-400" />
            <span>Accedi</span>
          </button>
        ) : null}

        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Passa al tema Chiaro' : 'Passa al tema Scuro'}
          className={`p-1.5 rounded-md transition-colors ${
            isDarkMode
              ? 'hover:bg-[#2c2c2c] text-neutral-300'
              : 'hover:bg-[#e8e8e8] text-neutral-600'
          }`}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-0.5" />

        {/* Minimize */}
        <button
          onClick={() => showToast('Finestra ridotta (simulata)')}
          title="Riduci a icona"
          className={`w-10 h-7 flex items-center justify-center transition-colors rounded ${
            isDarkMode ? 'hover:bg-[#2d2d2d]' : 'hover:bg-[#e5e5e5]'
          }`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={() => {
            setIsMaximized(!isMaximized);
            showToast(isMaximized ? 'Finestra ripristinata' : 'Finestra ingrandita');
          }}
          title={isMaximized ? 'Ripristina' : 'Ingrandisci'}
          className={`w-10 h-7 flex items-center justify-center transition-colors rounded ${
            isDarkMode ? 'hover:bg-[#2d2d2d]' : 'hover:bg-[#e5e5e5]'
          }`}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>

        {/* Close Button (Authentic Windows red hover) */}
        <button
          onClick={() => showToast('Chiusura app')}
          title="Chiudi"
          className="w-10 h-7 flex items-center justify-center transition-colors rounded hover:bg-[#e81123] hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
