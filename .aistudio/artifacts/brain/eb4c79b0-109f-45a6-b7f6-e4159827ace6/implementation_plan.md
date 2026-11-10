# Riconoscimento Artisti tramite API Musicali Ufficiali e Menu Candidati

Sostituzione del fragile web-scraping con le API musicali ufficiali e certificate di **iTunes Search** e **MusicBrainz**, abbinate a un menu a tendina contestuale (*Candidate Picker*) a 1-clic per risolvere ambiguità su brani omonimi nel rap italiano.

---

## Decisioni Utente Confermate (Fase 1)

> [!IMPORTANT]
> - **Fonte Dati Scelta**: API musicali ufficiali (**iTunes Search API** e **MusicBrainz**) al posto del web scraping su Google/Genius.
> - **Risoluzione Ambiguità**: Menu a tendina inline a 1-clic che mostra i migliori candidati ordinati per pertinenza e genere rap/hip-hop italiano.
> - **Integrità UI**: Stile minimale Windows 11, nessun elemento grafico distraente, evidenziazione rossa pulita sul campo artista vuoto con indicatore discreto del numero di opzioni trovate.

---

## 1. Architettura e Flusso Funzionale

```
┌────────────────────────────────────────────────────────┐
│                      Frontend UI                       │
│  - Campo artista vuoto evidenziato in rosso            │
│  - Ricerca automatica o manuale nel Catalogo Ufficiale │
│  - Popover / Dropdown "Candidate Picker" a 1-clic      │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/music-catalog-search
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Server Proxy Backend                  │
│  1. iTunes Search API (Catalogo IT / Hip-Hop/Rap)      │
│  2. MusicBrainz Recording Search (Dati aperti)         │
│  3. Normalizzazione, deduplicazione e separazione Feat │
│  4. Ranking per pertinenza al Rap Italiano             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Risultato JSON Strutturato                │
│  [                                                     │
│    { artist: "Gheba", feat: "Pavè", album: "...", ... }│
│    { artist: "Shiva", feat: "Eiffel 65", ... }         │
│  ]                                                     │
└────────────────────────────────────────────────────────┘
```

### Vantaggi rispetto al metodo precedente:
- **Zero allucinazioni e zero rate-limit 429**: L'API iTunes e MusicBrainz sono gratuite, progettate specificamente per query musicali e non vengono bloccate da bot-check.
- **Dati Certificati**: Nome esatto dell'artista principale, anno di uscita reale, album e featuring ufficiali già separati.
- **Controllo dell'utente**: Se un titolo come "Boxer" ha più versioni, l'utente vede l'artista con copertina/anno e sceglie quella desiderata con un solo clic.

---

## 2. Esperienza Utente & Design Visivo

### A. Stato Visivo del Campo Artista Vuoto
- Se il file non ha artista: il campo rimane vuoto con bordo e glow rosso tenue (`border-red-500/60 bg-red-500/5`).
- Al clic o alla ricerca rapida, compare un badge/pulsante discreto: `Opzioni trovate (3) ▼`.

### B. Menu a Tendina "Candidate Picker" (Minimal Windows 11)
- Popover agganciato direttamente alla riga della canzone (`absolute z-40 bg-[#1e1e1e] border border-[#383838] rounded-md shadow-2xl`).
- Ciascuna opzione mostra:
  - Miniatura copertina (32x32px) o icona disco se assente.
  - **Artista Principale** in evidenza (con eventuale `Feat. Artista Ospite` in grigio chiaro).
  - Titolo canzone, Anno di uscita e Genere (es. *Hip-Hop/Rap*).
- Cliccando su un candidato:
  - Il campo Artista si popola istantaneamente.
  - Eventuali featuring vengono inseriti nel rispettivo campo.
  - Il nome file suggerito viene ricalcolato in tempo reale.
  - Il bordo rosso scompare e la riga torna neutra.

---

## 3. Dettaglio Implementazione Tecnica

### Endpoint Backend (`server.ts`):
- `POST /api/music-catalog-search`:
  - Input: `{ title: string, hintGenre?: string }`
  - Chiamata contemporanea a **iTunes Search API** (`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&country=IT&entity=song&limit=10`) e fallback **MusicBrainz**.
  - Filtro e classificazione: priorità ai brani con genere `Hip-Hop/Rap`, `Musica Italiana` o artisti già presenti nel dizionario locale/Cloud SQL.
  - Restituzione di un array di candidati pronti all'uso.

### Componente Frontend:
- `src/components/CandidatePickerDropdown.tsx`:
  - Componente dropdown minimale accessibile da tastiera (`Esc` per chiudere, frecce per navigare).
  - Apertura/chiusura automatica con click-outside handler.
- Integrazione in `TrackRow.tsx` / `App.tsx`:
  - Sostituzione della vecchia modal di autorizzazione Google Search con l'integrazione del catalogo ufficiale.
  - Possibilità di cercare un singolo brano o lanciare la scansione di tutti i brani senza artista.

---

## 4. Piano di Verifica

1. **Test brani di prova**:
   - `Boxer.mp3` -> Ricerca catalogo -> Appare `Gheba` come primo candidato rap italiano.
   - `Auto Blu.mp3` -> Appare `Shiva` con `Eiffel 65`.
   - `Kichta Lova.mp3` -> Appare `Nabi` con `Lilcr`.
2. **Verifica Interazione**:
   - Clic sul candidato: popolazione immediata di Artista, Feat e Nome File.
   - Nessun crash o ritardo: risposta istantanea (<300ms).
3. **Compilazione & Linting**:
   - Esecuzione combinata di `compile_applet` e `lint_applet` prima della consegna.
