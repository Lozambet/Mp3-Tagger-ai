# Minimal UI & Distraction-Free Redesign

Un restyling completo dell'interfaccia utente mirato a eliminare tutte le didascalie ridondanti, badge secondari e micro-elementi di disturbo visivo, trasformando l'applicazione in un tool audio desktop estremamente pulito, moderno, veloce e intuitivo.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisioni confermate dall'utente nella fase di intervista:
> - **Elementi da eliminare**: rimozione completa di badge di stato secondari (es. pillole "Pronto", "Istantaneo <5ms", badge telemetry "Cloud SQL"), testi esplicativi lunghi e note descrittive.
> - **Barra dei Comandi**: layout compatto a singola riga focalizzato esclusivamente sulle azioni primarie (Carica, Scambia Titolo/Artista, Rifinisci AI, Scarica).
> - **Tabella Brani**: griglia essenziale, lineare e ad alto contrasto senza colonne ingombranti o scatter di badge colorati ad ogni riga.

---

## 1. Overview & Core Concept

- **Cosa fa**: Riorganizza il layout visivo dell'applicazione rimuovendo il rumore visivo (pillole decorative, indicatori di velocità, testi di aiuto ridondanti) per concentrare il 100% dell'attenzione dell'utente sulla visualizzazione dei brani e la modifica rapida dei metadati.
- **Target & Contesto**: Utente che vuole rinominare e taggare i propri file MP3 in pochi secondi con la massima chiarezza, senza dover leggere spiegazioni continue o navigare tra pulsanti rumorosi.
- **Valore Chiave**: Interfaccia ariosa, professionale e minimale in pieno stile Windows 11 Fluent / Modern Desktop, dove ogni controllo ha uno scopo chiaro e immediato.

---

## 2. Component & Visual Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  🎵 MP3 Tagger                [☀/🌙]  [👤 zambettienrico@gmail.com]     │  <- Minimal Title Bar
├────────────────────────────────────────────────────────────────────────┤
│  [+ Aggiungi MP3] [⇄ Inverti] [✨ Rifinisci AI]    [⬇ Scarica MP3 (3)] │  <- Compact Command Bar
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ☑  Titolo              ⇄  Artista & Feat        Nuovo Nome      ⋯    │  <- Clean Data Grid
│  ───────────────────────────────────────────────────────────────────   │
│   ☑  Kichta Lova         ⇄  Nabi; Lilcr           Kichta Lova...  ⬇ ✕  │
│   ☑  Auto Blu            ⇄  Shiva; Rondodasosa    Auto Blu - ...  ⬇ ✕  │
│   ☑  10 Cavallini        ⇄  Drillionare; Sfera... 10 Cavallini... ⬇ ✕  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│   3 brani selezionati · Pronto per il download                 [Log]   │  <- Quiet Status Line
└────────────────────────────────────────────────────────────────────────┘
```

### Principali Modifiche Visive per Componente

1. **Title Bar (`WindowsTitleBar.tsx`)**:
   - Eliminazione dei badge secondari decorativi (`Cloud SQL (PostgreSQL)`, `50 Cantanti`, `Istantaneo (<5ms)`).
   - Conservazione del titolo pulito dell'applicazione, del toggle modalità Chiara/Scura e dell'avatar essenziale di Google Auth.

2. **Barra dei Comandi (`WindowsCommandBar.tsx`)**:
   - Rimozione del badge decorativo centrale `"Istantaneo + AI Batch"`.
   - Riduzione del testo sui pulsanti:
     - Da *"Aggiungi File MP3"* a `Aggiungi MP3` (con dropdown leggero per cartella o sample).
     - Da *"Inverti Titolo ⇄ Artista (X)"* a `Inverti Titolo/Artista`.
     - Da *"Rifinisci con AI (Batch Rapido)"* a `Rifinisci con AI`.
     - Pulsante di download essenziale e chiaro: `Scarica MP3` o `Scarica ZIP` con menu compatto per scegliere la modalità.
   - Accesso al gestore cantanti noti tramite icona pulita e discreta con conteggio essenziale.

3. **Tabella dei Brani (`WindowsTrackTable.tsx`)**:
   - **Zero Pill / No Badge Scatter**: rimozione dei badge verdi *"Pronto"* e blu *"AI OK"* da ogni singola riga (lo stato nominale è il default; viene mostrato solo un micro-spinner quando un brano è attivamente in elaborazione AI).
   - **Semplificazione Colonne**:
     - Checkbox selezione rapida.
     - *Titolo* (input inline pulito).
     - *⇄ Inverti* (pulsante rapido a icona).
     - *Artista* (input inline con supporto punto e virgola `;`).
     - *Nome File Generato* (anteprima tipografica leggibile).
     - *Azioni* raggruppate: Ascolta (Play), Scarica diretto, Ispeziona/Dettagli, Elimina riga.
   - I campi *Album* e *Anno* rimangono accessibili sia nella modale di ispezione completa sia tramite colonna opzionale/discreta senza rubare spazio visivo.
   - **Empty State Semplificato**: area di rilascio minimale ed elegante, senza lunghi paragrafi tecnici.

4. **Barra di Stato (`WindowsStatusBar.tsx`)**:
   - Riduzione a una singola linea discreta e non invasiva: conteggio brani e dimensione totale, con link compatto al registro eventi solo se necessario.

---

## 3. Piano di Esecuzione e Verifica

1. **Fase 1 - Refactoring Barra dei Comandi (`WindowsCommandBar.tsx`)**:
   - Eliminare badge statici e testi descrittivi nei pulsanti.
   - Rendere il layout compatto a singola riga con icone standard Lucide.

2. **Fase 2 - Semplificazione Tabella Brani (`WindowsTrackTable.tsx`)**:
   - Rimuovere i badge di stato ridondanti per ciascuna riga.
   - Sfoltire l'header della tabella eliminando didascalie e label ingombranti.
   - Ridisegnare l'area di drop iniziale (drag & drop) per un aspetto minimale.

3. **Fase 3 - Semplificazione TitleBar e StatusBar (`WindowsTitleBar.tsx` & `WindowsStatusBar.tsx`)**:
   - Rimuovere chip decorativi e status clutter.
   - Mantenere la coerenza del tema Dark/Light con bordi ultra-sottili (hairline 1px) e spaziatura ariosa.

4. **Fase 4 - Verifica**:
   - Compilazione con `compile_applet` e validazione statica con `lint_applet`.
   - Test visivo e funzionale di caricamento brani, inversione, rifinitura AI e download smart.
