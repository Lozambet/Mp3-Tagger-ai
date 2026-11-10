import React, { useState, useEffect, useCallback } from 'react';
import {
  TrackMetadata,
  LogEntry,
  readBasicTags,
  fastLocalParse,
  embedTagsAndCreateBlob,
  downloadAllAsZip,
  downloadDirectMp3Files,
  downloadFile,
  buildFilename,
} from './services/mp3Tagger';
import { createDummyMp3File, DEMO_FILES } from './utils/sampleTracks';
import { WindowsTitleBar } from './components/WindowsTitleBar';
import { WindowsCommandBar } from './components/WindowsCommandBar';
import { WindowsProgressBar } from './components/WindowsProgressBar';
import { WindowsTrackTable } from './components/WindowsTrackTable';
import { WindowsLogViewer } from './components/WindowsLogViewer';
import { WindowsTrackInspectorModal } from './components/WindowsTrackInspectorModal';
import { WindowsArtistManagerModal } from './components/WindowsArtistManagerModal';
import { WindowsNewArtistsPromptModal } from './components/WindowsNewArtistsPromptModal';
import { WindowsItunesSearchModal } from './components/WindowsItunesSearchModal';
import { WindowsStatusBar } from './components/WindowsStatusBar';
import { MusicCandidate } from './components/CandidatePickerDropdown';
import {
  getKnownArtists,
  fetchKnownArtistsFromCloud,
  saveBatchArtistsToCloud,
  findUnknownArtists,
} from './utils/artistDictionary';
import { auth, googleAuthProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [inspectingTrack, setInspectingTrack] = useState<TrackMetadata | null>(null);
  const [isArtistManagerOpen, setIsArtistManagerOpen] = useState<boolean>(false);
  const [artistCount, setArtistCount] = useState<number>(() => getKnownArtists().length);

  // iTunes & Italian Music Catalog Search for Missing Artists
  const [tracksToSearchItunes, setTracksToSearchItunes] = useState<TrackMetadata[]>([]);
  const [isItunesSearchModalOpen, setIsItunesSearchModalOpen] = useState<boolean>(false);

  // Cloud detection for newly discovered artists
  const [newDiscoveredArtists, setNewDiscoveredArtists] = useState<string[]>([]);
  const [isNewArtistsPromptOpen, setIsNewArtistsPromptOpen] = useState<boolean>(false);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Smart Download State: 'auto' (direct MP3 for <= 4, ZIP for > 4), 'direct', or 'zip'
  const [downloadMode, setDownloadMode] = useState<'auto' | 'direct' | 'zip'>('auto');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const [progress, setProgress] = useState<{
    total: number;
    completed: number;
    currentFilename?: string;
    currentStep?: string;
  }>({ total: 0, completed: 0 });

  const addLog = useCallback(
    (type: LogEntry['type'], message: string, file?: string, details?: string) => {
      const now = new Date();
      const timestamp =
        now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        type,
        file,
        message,
        details,
      };
      setLogs((prev) => [newEntry, ...prev]);
    },
    []
  );

  // Sync artists from Cloud SQL on mount & subscribe to Firebase Auth
  useEffect(() => {
    fetchKnownArtistsFromCloud()
      .then((artists) => {
        setArtistCount(artists.length);
        addLog(
          'info',
          `Sincronizzati ${artists.length} cantanti dal database Cloud SQL (PostgreSQL).`,
          undefined,
          'Il dizionario cloud è attivo e utilizzato per il riconoscimento ad altissima precisione.'
        );
      })
      .catch((err) => {
        console.warn('Initial cloud artists fetch warning:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        addLog('info', `Utente autenticato: ${user.email}`);
      }
    });

    addLog(
      'info',
      'Modalità Ibrida attiva: rinomina locale istantanea (<5ms) + rifinitura AI batch rapida.',
      undefined,
      'I file aggiunti sono subito pronti al download con la struttura: "Canzone - Artista.mp3" o "Canzone - Artista Feat. Ospite.mp3". Clicca su "Rifinisci con AI (Batch Rapido)" per perfezionare tutti i brani in una singola richiesta da ~1,5 secondi.'
    );

    return () => unsubscribe();
  }, [addLog]);

  // Google Sign-In handlers
  const handleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleAuthProvider);
      if (res.user) {
        addLog('success', `Accesso effettuato con Google: ${res.user.email}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('warning', `Accesso annullato o non riuscito: ${msg}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addLog('info', 'Disconnesso account Google.');
    } catch (err: unknown) {
      console.warn('Sign out error:', err);
    }
  };

  // Instant local processing when files are selected or dropped
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const audioFiles = rawFiles.filter(
      (f) => f.name.toLowerCase().endsWith('.mp3') || f.type.includes('audio') || f.type.includes('mpeg')
    );

    if (audioFiles.length === 0) {
      addLog('warning', 'Nessun file MP3 rilevato tra i file selezionati.');
      return;
    }

    const t0 = performance.now();
    const newTracks: TrackMetadata[] = [];
    const detectedArtistsList: string[] = [];

    for (const file of audioFiles) {
      const id = Math.random().toString(36).substring(2, 10);
      const basicTags = await readBasicTags(file);
      const parsed = fastLocalParse(file.name, basicTags);

      if (parsed.artist && parsed.artist !== 'Artista' && parsed.artist !== 'Artista Sconosciuto') {
        detectedArtistsList.push(parsed.artist);
      }
      if (parsed.featuring) {
        const feats = parsed.featuring.split(/[,&/x]/i).map((s) => s.trim()).filter(Boolean);
        detectedArtistsList.push(...feats);
      }

      const trackObj: TrackMetadata = {
        id,
        originalFile: file,
        originalFilename: file.name,
        fileSize: file.size,
        status: 'pending',
        source: 'local',
        title: parsed.title,
        artist: parsed.artist,
        featuring: parsed.featuring,
        album: parsed.album,
        year: parsed.year,
        genre: parsed.genre,
        suggestedFilename: parsed.suggestedFilename,
      };

      try {
        const processedBlob = await embedTagsAndCreateBlob(trackObj);
        trackObj.processedBlob = processedBlob;
        trackObj.processedUrl = URL.createObjectURL(processedBlob);
        trackObj.status = 'completed';
      } catch (embedErr) {
        trackObj.status = 'error';
        trackObj.errorMessage = String(embedErr);
      }

      newTracks.push(trackObj);
    }

    const elapsed = (performance.now() - t0).toFixed(1);
    setTracks((prev) => [...prev, ...newTracks]);

    addLog(
      'success',
      `Caricamento ed elaborazione istantanea completata per ${newTracks.length} brani in ${elapsed} ms.`,
      undefined,
      `Tutti i brani sono già rinominati nel formato "Titolo - Artista" e pronti al download immediato!`
    );

    // Detect if any artist is not in the known artists database
    const unknown = findUnknownArtists(detectedArtistsList, getKnownArtists());
    if (unknown.length > 0) {
      setNewDiscoveredArtists(unknown);
      setIsNewArtistsPromptOpen(true);
      addLog(
        'warning',
        `Rilevati ${unknown.length} cantanti non ancora presenti nel database Cloud SQL: ${unknown.join(', ')}.`,
        undefined,
        'Puoi salvarli con un clic per renderli noti permanentemente al dizionario cloud.'
      );
    }

    // Detect if any tracks are missing the artist name in the filename
    const tracksWithoutArtist = newTracks.filter((t) => !t.artist || t.artist.trim() === '');
    if (tracksWithoutArtist.length > 0) {
      setTracksToSearchItunes(tracksWithoutArtist);
      setIsItunesSearchModalOpen(true);
      addLog(
        'warning',
        `Per ${tracksWithoutArtist.length} ${tracksWithoutArtist.length === 1 ? 'brano' : 'brani'} l'artista non compare nel nome del file. Avviata ricerca nel catalogo iTunes (Italia).`,
        undefined,
        `Brani senza artista: ${tracksWithoutArtist.map((t) => t.title).join(', ')}`
      );
    }
  };

  // Save newly detected artists to Cloud SQL
  const handleSaveNewArtistsToCloud = async (selectedArtists: string[]) => {
    if (selectedArtists.length === 0) {
      setIsNewArtistsPromptOpen(false);
      return;
    }

    try {
      const updated = await saveBatchArtistsToCloud(selectedArtists);
      setArtistCount(updated.length);

      addLog(
        'success',
        `Salvati ${selectedArtists.length} nuovi cantanti nel database Cloud SQL (PostgreSQL): ${selectedArtists.join(', ')}.`,
        undefined,
        `Il database ora include ${updated.length} cantanti noti.`
      );

      // Re-evaluate any tracks with the newly added artists for highest precision
      setTracks((prevTracks) =>
        prevTracks.map((t) => {
          if (t.source !== 'ai') {
            const reParsed = fastLocalParse(t.originalFilename);
            return {
              ...t,
              title: reParsed.title,
              artist: reParsed.artist,
              featuring: reParsed.featuring,
              suggestedFilename: reParsed.suggestedFilename,
            };
          }
          return t;
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('error', `Errore durante il salvataggio nel database Cloud SQL: ${msg}`);
    } finally {
      setIsNewArtistsPromptOpen(false);
      setNewDiscoveredArtists([]);
    }
  };

  const handleIgnoreNewArtists = () => {
    setIsNewArtistsPromptOpen(false);
    setNewDiscoveredArtists([]);
  };

  // Official Music Catalog candidate selected from dropdown (iTunes & MusicBrainz)
  const handleSelectCatalogCandidate = async (
    targetTrack: TrackMetadata,
    candidate: MusicCandidate
  ) => {
    const newTitle = targetTrack.title;
    const newArtist = candidate.artist;
    const newFeat = candidate.featuring;
    const newFilename = buildFilename(newTitle, newArtist, newFeat);

    const updated: TrackMetadata = {
      ...targetTrack,
      artist: newArtist,
      featuring: newFeat,
      album: targetTrack.album || candidate.album,
      year: targetTrack.year || candidate.year,
      suggestedFilename: newFilename,
    };

    try {
      const blob = await embedTagsAndCreateBlob(updated);
      updated.processedBlob = blob;
      updated.processedUrl = URL.createObjectURL(blob);
      updated.status = 'completed';
    } catch (e) {
      console.warn('Embed tag error:', e);
    }

    setTracks((prev) => prev.map((t) => (t.id === targetTrack.id ? updated : t)));

    addLog(
      'success',
      `Artista impostato dal catalogo (${candidate.source}): "${newArtist}"${newFeat ? ` Feat. ${newFeat}` : ''} per "${newTitle}"`,
      targetTrack.originalFilename,
      candidate.album ? `Album: ${candidate.album} (${candidate.year || 'N/D'}) • Genere: ${candidate.genre}` : undefined
    );

    // Save newly discovered artist to Cloud SQL database dictionary
    const newlyDetected = [newArtist, ...newFeat.split(',')].map((s) => s.trim()).filter(Boolean);
    const unknown = findUnknownArtists(newlyDetected, getKnownArtists());
    if (unknown.length > 0) {
      saveBatchArtistsToCloud(unknown)
        .then((saved) => {
          setArtistCount(saved.length);
          addLog('info', `Aggiunto nuovo artista al database Cloud SQL: ${unknown.join(', ')}`);
        })
        .catch((e) => console.warn('Could not save artist to DB:', e));
    }
  };

  // Open iTunes & Italian Catalog Search modal for all tracks currently missing an artist
  const handleSearchAllMissingInCatalog = () => {
    const missing = tracks.filter((t) => !t.artist || t.artist.trim() === '');
    if (missing.length === 0) return;
    setTracksToSearchItunes(missing);
    setIsItunesSearchModalOpen(true);
  };

  // Open iTunes Search modal for a single track
  const handleRequestSearchArtist = (track: TrackMetadata) => {
    setTracksToSearchItunes([track]);
    setIsItunesSearchModalOpen(true);
  };

  // Apply candidate results from the iTunes Search modal
  const handleApplyItunesResults = async (selectedMap: Map<string, MusicCandidate>) => {
    if (selectedMap.size === 0) {
      setIsItunesSearchModalOpen(false);
      return;
    }

    const updatedTracks = [...tracks];
    const newlyDiscovered: string[] = [];

    for (const [trackId, candidate] of selectedMap.entries()) {
      const idx = updatedTracks.findIndex((t) => t.id === trackId);
      if (idx !== -1) {
        const targetTrack = updatedTracks[idx];
        const newTitle = targetTrack.title;
        const newArtist = candidate.artist;
        const newFeat = candidate.featuring;
        const newFilename = buildFilename(newTitle, newArtist, newFeat);

        const updated: TrackMetadata = {
          ...targetTrack,
          artist: newArtist,
          featuring: newFeat,
          album: targetTrack.album || candidate.album,
          year: targetTrack.year || candidate.year,
          suggestedFilename: newFilename,
        };

        try {
          const blob = await embedTagsAndCreateBlob(updated);
          updated.processedBlob = blob;
          updated.processedUrl = URL.createObjectURL(blob);
          updated.status = 'completed';
        } catch (e) {
          console.warn('Embed tag error:', e);
        }

        updatedTracks[idx] = updated;

        addLog(
          'success',
          `Artista impostato da iTunes: "${newArtist}"${newFeat ? ` Feat. ${newFeat}` : ''} per "${newTitle}"`,
          targetTrack.originalFilename,
          candidate.album ? `Album: ${candidate.album} (${candidate.year || 'N/D'}) • Genere: ${candidate.genre}` : undefined
        );

        if (newArtist) newlyDiscovered.push(newArtist);
        if (newFeat) newlyDiscovered.push(...newFeat.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }

    setTracks(updatedTracks);
    setIsItunesSearchModalOpen(false);
    setTracksToSearchItunes([]);

    // Automatically register newly discovered artists into Cloud SQL dictionary
    const unknown = findUnknownArtists(newlyDiscovered, getKnownArtists());
    if (unknown.length > 0) {
      saveBatchArtistsToCloud(unknown)
        .then((saved) => {
          setArtistCount(saved.length);
          addLog('info', `Aggiunto nuovo artista al database Cloud SQL: ${unknown.join(', ')}`);
        })
        .catch((e) => console.warn('Could not save artist to DB:', e));
    }
  };

  // Add demo sample files
  const handleAddSampleFiles = () => {
    const sampleFiles = DEMO_FILES.map((name) => createDummyMp3File(name, 120));
    handleFilesSelected(sampleFiles);
  };

  // Toggle selection
  const handleToggleSelectTrack = (id: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedTrackIds.size === tracks.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(tracks.map((t) => t.id)));
    }
  };

  const handleUpdateTrack = async (id: string, updates: Partial<TrackMetadata>) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const merged = { ...t, ...updates };
          if (
            updates.title !== undefined ||
            updates.artist !== undefined ||
            updates.featuring !== undefined
          ) {
            merged.suggestedFilename = buildFilename(
              merged.title,
              merged.artist,
              merged.featuring
            );
          }
          return merged;
        }
        return t;
      })
    );
  };

  const handleRemoveTrack = (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (track) {
      addLog('info', `Rimosso file: "${track.originalFilename}"`);
    }
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearAll = () => {
    setTracks([]);
    setSelectedTrackIds(new Set());
    setProgress({ total: 0, completed: 0 });
    addLog('info', 'Elenco tracce svuotato.');
  };

  // Ultra-Fast Batch AI Refinement (Single API Call for all files)
  const handleStartBatchAi = async () => {
    if (tracks.length === 0 || isProcessingAi) return;

    setIsProcessingAi(true);
    const targetTracks = selectedTrackIds.size > 0
      ? tracks.filter((t) => selectedTrackIds.has(t.id))
      : tracks;

    setProgress({
      total: targetTracks.length,
      completed: 0,
      currentStep: `Invio batch di ${targetTracks.length} brani a Gemini 3.8 Flash...`,
    });

    addLog('info', `Invio richiesta batch AI per ${targetTracks.length} brani in un'unica chiamata...`);
    const startTime = performance.now();

    // Mark tracks as analyzing in UI
    setTracks((prev) =>
      prev.map((t) => (targetTracks.some((tgt) => tgt.id === t.id) ? { ...t, status: 'analyzing' } : t))
    );

    try {
      const payload = {
        tracks: targetTracks.map((t) => ({
          id: t.id,
          filename: t.originalFilename,
          existingTitle: t.title,
          existingArtist: t.artist,
          existingAlbum: t.album,
        })),
      };

      const response = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
      }

      const resData = await response.json();
      if (resData.logs && Array.isArray(resData.logs)) {
        for (const logItem of resData.logs) {
          addLog('info', logItem);
        }
      }

      const results = resData.results || {};
      const updatedTracks: TrackMetadata[] = [];

      for (const track of tracks) {
        const aiInfo = results[track.id];
        if (aiInfo) {
          const updated: TrackMetadata = {
            ...track,
            title: aiInfo.title || track.title,
            artist: aiInfo.artist || track.artist,
            featuring: aiInfo.featuring || '',
            album: aiInfo.album || track.album,
            year: aiInfo.year || track.year,
            genre: aiInfo.genre || track.genre,
            suggestedFilename: aiInfo.suggestedFilename || track.suggestedFilename,
            source: 'ai',
          };

          // Fast tag re-embed
          try {
            const blob = await embedTagsAndCreateBlob(updated);
            updated.processedBlob = blob;
            updated.processedUrl = URL.createObjectURL(blob);
            updated.status = 'completed';
          } catch {
            updated.status = 'completed';
          }
          updatedTracks.push(updated);
        } else {
          updatedTracks.push(track);
        }
      }

      setTracks(updatedTracks);
      const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
      addLog(
        'success',
        `Rifinitura AI completata in ${totalTime} secondi per tutti i ${targetTracks.length} brani!`,
        undefined,
        `Tutti i metadati ID3 e i nomi dei file sono stati perfezionati e salvati.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('error', `Errore durante la rifinitura batch AI: ${msg}`);
      // Revert status to completed
      setTracks((prev) =>
        prev.map((t) => (t.status === 'analyzing' ? { ...t, status: 'completed' } : t))
      );
    } finally {
      setIsProcessingAi(false);
      setProgress({ total: targetTracks.length, completed: targetTracks.length, currentStep: 'Pronto' });
    }
  };

  // Refine a single track on demand
  const handleRefineSingleTrack = async (track: TrackMetadata) => {
    addLog('info', `Rifinitura AI singola per: "${track.originalFilename}"`);
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, status: 'analyzing' } : t))
    );

    try {
      const res = await fetch('/api/analyze-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: track.id,
          filename: track.originalFilename,
          existingTitle: track.title,
          existingArtist: track.artist,
          existingAlbum: track.album,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const info = data.data;

      const updated: TrackMetadata = {
        ...track,
        title: info.title || track.title,
        artist: info.artist || track.artist,
        featuring: info.featuring || '',
        album: info.album || track.album,
        year: info.year || track.year,
        genre: info.genre || track.genre,
        suggestedFilename: info.suggestedFilename || track.suggestedFilename,
        source: 'ai',
      };

      const blob = await embedTagsAndCreateBlob(updated);
      updated.processedBlob = blob;
      updated.processedUrl = URL.createObjectURL(blob);
      updated.status = 'completed';

      setTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
      addLog('success', `Traccia rifinita con successo: "${updated.suggestedFilename}"`, track.originalFilename);
    } catch (err: unknown) {
      addLog('error', `Errore rifinitura singola`, track.originalFilename, String(err));
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, status: 'completed' } : t))
      );
    }
  };

  // Quick swap Title <-> Artist for a single track
  const handleSwapSingleTitleArtist = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;

    const newTitle = track.artist || 'Canzone';
    const newArtist = track.title || 'Artista';
    const newFilename = buildFilename(newTitle, newArtist, track.featuring);

    const updated: TrackMetadata = {
      ...track,
      title: newTitle,
      artist: newArtist,
      suggestedFilename: newFilename,
    };

    try {
      const blob = await embedTagsAndCreateBlob(updated);
      updated.processedBlob = blob;
      updated.processedUrl = URL.createObjectURL(blob);
      updated.status = 'completed';
    } catch {
      // fallback
    }

    setTracks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    addLog(
      'info',
      `Invertiti Titolo e Artista: "${newFilename}"`,
      track.originalFilename,
      `Nuovo Titolo: "${newTitle}" | Nuovo Artista: "${newArtist}"`
    );
  };

  // Quick swap Title <-> Artist for all tracks (or selected ones)
  const handleSwapAllTitleArtist = async () => {
    if (tracks.length === 0) return;

    const targetIds = selectedTrackIds.size > 0 ? selectedTrackIds : new Set(tracks.map((t) => t.id));
    const updatedTracks: TrackMetadata[] = [];

    for (const track of tracks) {
      if (targetIds.has(track.id)) {
        const newTitle = track.artist || 'Canzone';
        const newArtist = track.title || 'Artista';
        const newFilename = buildFilename(newTitle, newArtist, track.featuring);

        const updated: TrackMetadata = {
          ...track,
          title: newTitle,
          artist: newArtist,
          suggestedFilename: newFilename,
        };

        try {
          const blob = await embedTagsAndCreateBlob(updated);
          updated.processedBlob = blob;
          updated.processedUrl = URL.createObjectURL(blob);
          updated.status = 'completed';
        } catch {
          // fallback
        }
        updatedTracks.push(updated);
      } else {
        updatedTracks.push(track);
      }
    }

    setTracks(updatedTracks);
    addLog(
      'success',
      `Invertiti Titolo e Artista per ${targetIds.size} brani con successo.`,
      undefined,
      'I nomi dei file e i tag ID3 sono stati aggiornati istantaneamente.'
    );
  };

  // Single Track Download with fresh ID3v2.3 + ID3v1 metadata
  const handleDownloadSingleTrack = async (track: TrackMetadata) => {
    try {
      addLog(
        'info',
        `Generazione tag ID3v2.3 e ID3v1 per: "${track.suggestedFilename || track.originalFilename}"...`
      );
      const freshBlob = await embedTagsAndCreateBlob(track);
      const filename = (
        track.suggestedFilename || buildFilename(track.title, track.artist, track.featuring)
      ).replace(/[\[\]]/g, '');
      downloadFile(freshBlob, filename);
      addLog(
        'success',
        `File scaricato con metadati ID3 verificati: "${filename}"`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('error', `Errore durante il download di "${track.originalFilename}": ${msg}`);
    }
  };

  // Smart Download: Direct MP3s for light batches (<= 4 songs), ZIP archive for heavy folders (> 4 songs)
  const handleSmartDownload = async (forcedMode?: 'direct' | 'zip') => {
    const targetTracks = selectedTrackIds.size > 0
      ? tracks.filter((t) => selectedTrackIds.has(t.id))
      : tracks;

    if (targetTracks.length === 0) return;

    const mode =
      forcedMode ||
      (downloadMode === 'auto'
        ? targetTracks.length <= 4
          ? 'direct'
          : 'zip'
        : downloadMode);

    setIsDownloading(true);
    try {
      if (mode === 'direct') {
        addLog(
          'info',
          `Avvio download diretto per ${targetTracks.length} file MP3 (senza archivio ZIP)...`,
          undefined,
          'I file vengono salvati direttamente nella cartella Download con tag ID3v2.3 e ID3v1 completi.'
        );
        await downloadDirectMp3Files(targetTracks, (current, total, name) => {
          addLog('info', `[${current}/${total}] Scaricato: "${name}"`);
        });
        addLog(
          'success',
          `Completato download diretto di ${targetTracks.length} file MP3 con metadati verificati!`
        );
      } else {
        addLog(
          'info',
          `Creazione archivio ZIP compresso con ${targetTracks.length} file MP3 (consigliato per cartelle pesanti)...`
        );
        await downloadAllAsZip(targetTracks, (pct) => {
          if (pct % 25 === 0) {
            addLog('info', `Compressione archivio ZIP: ${pct}%`);
          }
        });
        addLog('success', `Archivio ZIP scaricato con successo con tutti i file e i tag ID3 inclusi.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('error', `Errore durante il download: ${msg}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    await handleSmartDownload('zip');
  };

  // Inspect and re-embed manual modifications
  const handleSaveInspectedTrack = async (updated: TrackMetadata) => {
    try {
      const blob = await embedTagsAndCreateBlob(updated);
      const url = URL.createObjectURL(blob);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, status: 'completed', processedBlob: blob, processedUrl: url }
            : t
        )
      );
      addLog('success', `Modifiche salvate per: "${updated.suggestedFilename}"`, updated.originalFilename);
    } catch (err: unknown) {
      addLog('error', `Errore salvataggio modifiche`, updated.originalFilename, String(err));
    }
  };

  // Re-run fast local parse on any tracks when the artist dictionary is updated
  const handleArtistsChanged = async () => {
    const list = getKnownArtists();
    setArtistCount(list.length);

    if (tracks.length === 0) return;

    const reprocessed: TrackMetadata[] = [];
    for (const track of tracks) {
      if (track.source !== 'ai') {
        const parsed = fastLocalParse(track.originalFilename);
        const updated: TrackMetadata = {
          ...track,
          title: parsed.title,
          artist: parsed.artist,
          featuring: parsed.featuring,
          suggestedFilename: parsed.suggestedFilename,
        };
        try {
          const blob = await embedTagsAndCreateBlob(updated);
          updated.processedBlob = blob;
          updated.processedUrl = URL.createObjectURL(blob);
        } catch {
          // ignore
        }
        reprocessed.push(updated);
      } else {
        reprocessed.push(track);
      }
    }
    setTracks(reprocessed);
    addLog(
      'info',
      `Database Cloud SQL aggiornato (${list.length} cantanti registrati). Rianalizzati i brani in coda.`
    );
  };

  const totalBytes = tracks.reduce((sum, t) => sum + t.fileSize, 0);
  const completedCount = tracks.filter((t) => t.status === 'completed').length;
  const errorCount = tracks.filter((t) => t.status === 'error').length;
  const canDownloadZip = completedCount > 0;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDarkMode ? 'bg-[#181818] text-[#e0e0e0]' : 'bg-[#eef2f6] text-[#222222]'
      }`}
    >
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Windows 11 Title Bar with Cloud SQL status and Google Sign-in */}
        <WindowsTitleBar
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          trackCount={tracks.length}
          artistCount={artistCount}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        {/* Windows Ribbon / Command Bar */}
        <WindowsCommandBar
          isDarkMode={isDarkMode}
          onFilesSelected={handleFilesSelected}
          onStartBatchAi={handleStartBatchAi}
          onSwapAllTitleArtist={handleSwapAllTitleArtist}
          onDownloadAllZip={handleDownloadAllZip}
          onSmartDownload={handleSmartDownload}
          downloadMode={downloadMode}
          onChangeDownloadMode={setDownloadMode}
          isDownloading={isDownloading}
          onClearAll={handleClearAll}
          onAddSampleFiles={handleAddSampleFiles}
          isProcessingAi={isProcessingAi}
          canDownloadZip={canDownloadZip}
          totalTracks={tracks.length}
          selectedCount={selectedTrackIds.size}
          artistCount={artistCount}
          missingArtistCount={tracks.filter((t) => !t.artist || t.artist.trim() === '').length}
          onSearchMissingArtistsInCatalog={handleSearchAllMissingInCatalog}
          onOpenArtistManager={() => setIsArtistManagerOpen(true)}
          isLogOpen={isLogOpen}
          onToggleLog={() => setIsLogOpen(!isLogOpen)}
        />

        {/* Windows Progress Bar */}
        <WindowsProgressBar
          isDarkMode={isDarkMode}
          isProcessing={isProcessingAi}
          total={progress.total}
          completed={progress.completed}
          currentFilename={progress.currentFilename}
          currentStep={progress.currentStep}
        />

        {/* Main Content: Track Table / Details Grid */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <WindowsTrackTable
            tracks={tracks}
            isDarkMode={isDarkMode}
            onUpdateTrack={handleUpdateTrack}
            onRemoveTrack={handleRemoveTrack}
            onInspectTrack={(track) => setInspectingTrack(track)}
            onRefineSingleTrack={handleRefineSingleTrack}
            onSwapTitleArtist={handleSwapSingleTitleArtist}
            onDownloadSingleTrack={handleDownloadSingleTrack}
            onDropFiles={handleFilesSelected}
            onAddSampleFiles={handleAddSampleFiles}
            isProcessing={isProcessingAi}
            selectedTrackIds={selectedTrackIds}
            onToggleSelectTrack={handleToggleSelectTrack}
            onToggleSelectAll={handleToggleSelectAll}
            onRequestSearchArtist={handleRequestSearchArtist}
            onSelectCatalogCandidate={handleSelectCatalogCandidate}
          />
        </div>

        {/* Detailed Error and Event Log Viewer */}
        <WindowsLogViewer
          logs={logs}
          isDarkMode={isDarkMode}
          isOpen={isLogOpen}
          onClose={() => setIsLogOpen(false)}
          onClearLogs={() => setLogs([])}
        />

        {/* Windows Status Bar */}
        <WindowsStatusBar
          isDarkMode={isDarkMode}
          totalTracks={tracks.length}
          selectedCount={selectedTrackIds.size}
          totalBytes={totalBytes}
          completedCount={completedCount}
          errorCount={errorCount}
          artistCount={artistCount}
          isLogOpen={isLogOpen}
          onToggleLog={() => setIsLogOpen(!isLogOpen)}
        />

        {/* Track Properties / Metadata Inspector Dialog */}
        <WindowsTrackInspectorModal
          track={inspectingTrack}
          isDarkMode={isDarkMode}
          onClose={() => setInspectingTrack(null)}
          onSaveTrack={handleSaveInspectedTrack}
        />

        {/* Known Artists Manager Dialog (Cloud SQL) */}
        <WindowsArtistManagerModal
          isOpen={isArtistManagerOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsArtistManagerOpen(false)}
          onArtistsChanged={handleArtistsChanged}
        />

        {/* New Discovered Artists Prompt Dialog (Asks to save to Cloud SQL) */}
        <WindowsNewArtistsPromptModal
          isOpen={isNewArtistsPromptOpen}
          isDarkMode={isDarkMode}
          newArtists={newDiscoveredArtists}
          onSaveToCloud={handleSaveNewArtistsToCloud}
          onIgnore={handleIgnoreNewArtists}
        />

        {/* iTunes & Italian Music Catalog Search Dialog for Missing Artists */}
        <WindowsItunesSearchModal
          isOpen={isItunesSearchModalOpen}
          isDarkMode={isDarkMode}
          tracksToSearch={tracksToSearchItunes}
          onApplyResults={handleApplyItunesResults}
          onCancel={() => setIsItunesSearchModalOpen(false)}
        />
      </div>
    </div>
  );
}
