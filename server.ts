import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

interface TrackInput {
  id: string;
  filename: string;
  existingTitle?: string;
  existingArtist?: string;
  existingAlbum?: string;
}

interface BatchAnalyzeRequest {
  tracks: TrackInput[];
}

import { extractArtistsAndTitle, formatProperCase, KnownArtist, DEFAULT_ARTISTS } from './src/utils/artistDictionary.ts';
import {
  getKnownArtistsFromDb,
  addKnownArtistsToDb,
  removeKnownArtistFromDb,
  resetKnownArtistsInDb,
} from './src/db/artists.ts';
import { optionalAuth } from './src/middleware/auth.ts';

export function buildCleanFilename(title: string, artist: string, featuring?: string): string {
  const cleanTitle = formatProperCase((title || 'Canzone').replace(/[\[\]]/g, '').trim());
  const rawArtist = (artist || '').replace(/[\[\]]/g, '').trim();
  const cleanArtist =
    rawArtist.toLowerCase() === 'artista' || rawArtist.toLowerCase() === 'artista sconosciuto'
      ? ''
      : formatProperCase(rawArtist);

  const cleanFeat = featuring
    ? featuring
        .split(/[,&/x]/i)
        .map((f) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
        .filter(Boolean)
        .join(', ')
    : '';

  if (!cleanArtist) {
    return cleanFeat ? `${cleanTitle} Feat. ${cleanFeat}.mp3` : `${cleanTitle}.mp3`;
  }

  const formatted = cleanFeat
    ? `${cleanTitle} - ${cleanArtist} Feat. ${cleanFeat}`
    : `${cleanTitle} - ${cleanArtist}`;

  return `${formatted}.mp3`;
}

// Fast heuristic fallback using the artist dictionary
export function fallbackCleanParse(rawName: string, artistsList?: KnownArtist[]) {
  const extracted = extractArtistsAndTitle(rawName, artistsList);
  const suggestedFilename = buildCleanFilename(extracted.title, extracted.artist, extracted.featuring);

  return {
    title: extracted.title,
    artist: extracted.artist,
    featuring: extracted.featuring,
    album: '',
    year: '',
    genre: '',
    suggestedFilename,
    confidence: extracted.matchedFromDict ? 'artist_dict' : 'heuristic',
  };
}

// BATCH API: Analyze all tracks in ONE single ultra-fast AI call (1-2 seconds total for the entire batch!)
app.post('/api/analyze-batch', async (req: Request, res: Response): Promise<void> => {
  const { tracks } = req.body as BatchAnalyzeRequest;

  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'Nessuna traccia inviata per l\'analisi batch' });
    return;
  }

  const logs: string[] = [];
  const startTime = Date.now();
  logs.push(`Avviata analisi batch AI per ${tracks.length} brani in un'unica richiesta...`);

  // Default fallback for each track
  const resultMap: Record<
    string,
    {
      title: string;
      artist: string;
      featuring: string;
      album: string;
      year: string;
      genre: string;
      suggestedFilename: string;
      confidence: string;
    }
  > = {};

  for (const t of tracks) {
    resultMap[t.id] = fallbackCleanParse(t.filename);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const trackListText = tracks
        .map(
          (t, idx) =>
            `${idx + 1}. [ID: ${t.id}] Nome file: "${t.filename}"${
              t.existingTitle ? ` | Tag ID3 titolo: "${t.existingTitle}"` : ''
            }${t.existingArtist ? ` | Tag ID3 artista: "${t.existingArtist}"` : ''}`
        )
        .join('\n');

      const prompt = `Analizza l'elenco seguente di file audio MP3 ed estrai i metadati corretti per ciascuno.
Elenco brani:
${trackListText}

REGOLE TASSATIVE:
1. NON inserire MAI parentesi quadre "[" o "]" nei titoli, nomi di artisti o nomi file.
2. CAPITALIZZAZIONE (Title Case): Tutti i titoli e i nomi di artisti devono iniziare con la maiuscola, tranne parole di 1-2 lettere in mezzo alla frase (es. "di", "a", "da", "in", "con", "su", "per", "e", "o", "il", "la", "of", "to"). Le scritte ALL CAPS (es: "KICHTA LOVA" o "LILCR") DEVONO essere convertite in "Kichta Lova" e "Lilcr".
3. IL TITOLO NON DEVE CONTENERE ARTISTI: Il titolo deve essere unicamente il nome della canzone (es. "Kichta Lova"). Rimuovi completamente qualsiasi riferimento ad artisti, featuring o "(feat. ...)" dal titolo.
4. ARTISTI MULTIPLI: Se ci sono più artisti (es: "Nabi, LILCR"), il primo è l'artista principale ("Nabi"), mentre i restanti vanno nel campo "featuring" ("Lilcr").
5. ALBUM E ANNO: NON INVENTARE MAI ALBUM O ANNO. NON PRENDERLI MAI DAL NOME DEL FILE. Lascia sempre album="" e year="" vuoti a meno che non siano già espressamente indicati nei Tag ID3 esistenti forniti. Se vuole, li aggiungerà l'utente.
6. SUGGESTED FILENAME: Formato esatto:
   "Nome Canzone - Artista Principale.mp3" (se senza feat)
   oppure "Nome Canzone - Artista Principale Feat. Artista Ospite.mp3" (se con feat)
   (Usa trattino medio " - " con spazio prima e dopo, rigorosamente SENZA parentesi quadre).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Sei un motore di tagging batch audio ad altissima velocità. Estrai i metadati e restituisci un array JSON. Rispetta la capitalizzazione corretta (Title Case, 1-2 lettere minuscole), non mettere mai artisti nel titolo, usa sempre il formato Nome Canzone - Artista Feat. Ospite.mp3 senza parentesi quadre. NON inventare MAI album o anno, lasciali vuoti se non presenti.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'L\'ID della traccia fornita' },
                title: { type: Type.STRING, description: 'Titolo canzone pulito senza artisti o feat' },
                artist: { type: Type.STRING, description: 'Artista principale' },
                featuring: { type: Type.STRING, description: 'Artisti featuring o vuoto' },
                album: { type: Type.STRING, description: 'Lascia vuoto se non fornito nei tag ID3' },
                year: { type: Type.STRING, description: 'Lascia vuoto se non fornito nei tag ID3' },
                genre: { type: Type.STRING, description: 'Genere' },
                suggestedFilename: {
                  type: Type.STRING,
                  description: 'Nome file: "Canzone - Artista Feat. Ospite.mp3"',
                },
              },
              required: ['id', 'title', 'artist'],
            },
          },
        },
      });

      const rawJson = response.text;
      if (rawJson) {
        const parsedList = JSON.parse(rawJson);
        if (Array.isArray(parsedList)) {
          for (const item of parsedList) {
            if (item.id && resultMap[item.id]) {
              let title = formatProperCase((item.title || resultMap[item.id].title).replace(/[\[\]]/g, '').trim());
              const artist = formatProperCase((item.artist || resultMap[item.id].artist).replace(/[\[\]]/g, '').trim());
              const featuring = (item.featuring || '')
                ? item.featuring
                    .split(/[,&/x]/i)
                    .map((f: string) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
                    .filter(Boolean)
                    .join(', ')
                : '';

              // Ensure title does not contain artist references
              const artistsToRemove = [artist, ...featuring.split(', ').filter(Boolean)];
              for (const art of artistsToRemove) {
                if (!art) continue;
                const escaped = art.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                title = title.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
              }
              title = formatProperCase(
                title
                  .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ' ')
                  .replace(/^[\s\-_,.:]+/, '')
                  .replace(/[\s\-_,.:]+$/, '')
                  .trim()
              ) || 'Canzone';

              // Rule: Never invent album or year. Keep empty unless originally provided in existing tags
              const origTrack = tracks.find((tr) => tr.id === item.id);
              const album = origTrack?.existingAlbum
                ? formatProperCase(origTrack.existingAlbum.replace(/[\[\]]/g, '').trim())
                : '';
              const year = '';
              const genre = (item.genre || '').trim();

              const cleanName = buildCleanFilename(title, artist, featuring);

              resultMap[item.id] = {
                title,
                artist,
                featuring,
                album,
                year,
                genre,
                suggestedFilename: cleanName,
                confidence: 'ai',
              };
            }
          }
        }
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logs.push(`Elaborazione batch AI completata con successo per ${tracks.length} brani in ${elapsed} secondi.`);
      }
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      logs.push(`Avviso AI batch: ${msg}. Utilizzati metadati euristici istantanei locali.`);
    }
  } else {
    logs.push('AI non configurata, applicato parser euristico locale ultra-veloce.');
  }

  res.json({
    success: true,
    results: resultMap,
    logs,
  });
});

// Single Track Analysis (for individual row refinement)
app.post('/api/analyze-track', async (req: Request, res: Response): Promise<void> => {
  const { filename, existingTitle, existingArtist, existingAlbum } = req.body as TrackInput;

  if (!filename) {
    res.status(400).json({ error: 'Il parametro filename è obbligatorio' });
    return;
  }

  const logs: string[] = [];
  let parsedData = fallbackCleanParse(filename);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Analizza questo file audio MP3.
Nome file originale: "${filename}"
${existingTitle ? `Titolo ID3 presente: "${existingTitle}"` : ''}
${existingArtist ? `Artista ID3 presente: "${existingArtist}"` : ''}
${existingAlbum ? `Album ID3 presente: "${existingAlbum}"` : ''}

REGOLE TASSATIVE:
1. NON usare MAI parentesi quadre "[" o "]".
2. CAPITALIZZAZIONE (Title Case): Tutti i titoli e i nomi di artisti devono iniziare con la maiuscola, tranne parole di 1-2 lettere in mezzo alla frase (es. "di", "a", "da", "in", "con", "su", "per", "e", "o", "il", "la", "of", "to"). Le scritte ALL CAPS (es: "KICHTA LOVA" o "LILCR") DEVONO essere convertite in "Kichta Lova" e "Lilcr".
3. IL TITOLO NON DEVE CONTENERE ARTISTI: Il titolo deve essere unicamente il nome della canzone (es. "Kichta Lova"). Rimuovi completamente qualsiasi riferimento ad artisti, featuring o "(feat. ...)" dal titolo.
4. ARTISTI MULTIPLI: Se ci sono più artisti (es: "Nabi, LILCR"), il primo è l'artista principale ("Nabi"), mentre i restanti vanno nel campo "featuring" ("Lilcr").
5. ALBUM E ANNO: NON INVENTARE MAI ALBUM O ANNO. NON PRENDERLI MAI DAL NOME DEL FILE. Lascia sempre album="" e year="" vuoti a meno che non siano già espressamente indicati nei Tag ID3 esistenti forniti. Se vuole, li aggiungerà l'utente.
6. SUGGESTED FILENAME: Formato esatto:
   "Nome Canzone - Artista Principale.mp3" oppure
   "Nome Canzone - Artista Principale Feat. Artista Ospite.mp3"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Estrai i metadati e il nome file pulito in Title Case senza parentesi quadre nel formato: "Canzone - Artista Feat. Ospite.mp3". Rimuovi qualsiasi artista dal titolo. NON inventare MAI album o anno, lasciali vuoti se non presenti nei tag ID3.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Titolo canzone pulito senza artisti' },
              artist: { type: Type.STRING, description: 'Artista principale' },
              featuring: { type: Type.STRING, description: 'Artisti featuring' },
              album: { type: Type.STRING, description: 'Lascia vuoto se non fornito nei tag ID3' },
              year: { type: Type.STRING, description: 'Lascia vuoto se non fornito nei tag ID3' },
              genre: { type: Type.STRING },
              suggestedFilename: { type: Type.STRING },
            },
            required: ['title', 'artist'],
          },
        },
      });

      const rawJson = response.text;
      if (rawJson) {
        const aiResult = JSON.parse(rawJson);
        let title = formatProperCase((aiResult.title || parsedData.title).replace(/[\[\]]/g, '').trim());
        const artist = formatProperCase((aiResult.artist || parsedData.artist).replace(/[\[\]]/g, '').trim());
        const featuring = (aiResult.featuring || '')
          ? aiResult.featuring
              .split(/[,&/x]/i)
              .map((f: string) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
              .filter(Boolean)
              .join(', ')
          : '';

        // Ensure title does not contain artist references
        const artistsToRemove = [artist, ...featuring.split(', ').filter(Boolean)];
        for (const art of artistsToRemove) {
          if (!art) continue;
          const escaped = art.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          title = title.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
        }
        title = formatProperCase(
          title
            .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ' ')
            .replace(/^[\s\-_,.:]+/, '')
            .replace(/[\s\-_,.:]+$/, '')
            .trim()
        ) || 'Canzone';

        // Rule: Never invent album or year. Keep empty unless originally provided in existing tags
        const album = existingAlbum ? formatProperCase(existingAlbum.replace(/[\[\]]/g, '').trim()) : '';
        const year = '';
        const genre = (aiResult.genre || '').trim();
        const suggestedFilename = buildCleanFilename(title, artist, featuring);

        parsedData = {
          title,
          artist,
          featuring,
          album,
          year,
          genre,
          suggestedFilename,
          confidence: 'ai',
        };
        logs.push(`AI completata per "${suggestedFilename}"`);
      }
    } catch (aiErr: unknown) {
      logs.push(`Parser locale applicato per ${filename}`);
    }
  }

  res.json({
    success: true,
    data: parsedData,
    logs,
  });
});

// GOOGLE SEARCH GROUNDING: Search Main Artist using gemini-3.8-flash with googleSearch tool
app.post('/api/search-artist', async (req: Request, res: Response): Promise<void> => {
  const { title, originalFilename } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Titolo mancante per la ricerca' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY non configurata' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Cerca con Google chi è l'artista o il cantante principale della canzone/brano musicale intitolato: "${title}".
Nome file originario: "${originalFilename || title}".

REGOLE TASSATIVE:
1. Usa Google Search per trovare informazioni reali e accurate sull'interprete/cantante principale della canzone.
2. Rispondi RIGOROSAMENTE con un oggetto JSON valido (senza testo prima o dopo) con la seguente struttura:
{
  "artist": "Nome Artista Principale",
  "featuring": "Eventuali artisti in featuring separati da virgola (lascia stringa vuota se nessuno)",
  "found": true,
  "songTitle": "Titolo corretto"
}
3. Capitalizzazione corretta (Title Case): tutte le parole iniziano con la maiuscola tranne parole di 1-2 lettere in mezzo (es. "di", "a", "da", "con", "il", "la", "e", "of", "to"). NON usare MAI parentesi quadre.
4. Se non trovi la canzone con certezza, rispondi con {"found": false, "artist": "", "featuring": ""}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || '';
    let parsed = { artist: '', featuring: '', found: false, songTitle: '' };
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('JSON parse fallback in search-artist:', e);
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) =>
        c.web?.title ? { title: String(c.web.title), uri: String(c.web.uri || '') } : null
      )
      .filter((s): s is { title: string; uri: string } => s !== null);

    const cleanArtist = formatProperCase((parsed.artist || '').replace(/[\[\]]/g, '').trim());
    const cleanFeat = parsed.featuring
      ? parsed.featuring
          .split(/[,&/x]/i)
          .map((f: string) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
          .filter(Boolean)
          .join(', ')
      : '';

    res.json({
      success: true,
      found: parsed.found ?? Boolean(cleanArtist),
      artist: cleanArtist,
      featuring: cleanFeat,
      songTitle: parsed.songTitle ? formatProperCase(parsed.songTitle) : title,
      sources,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Errore ricerca artista con Google:', msg);
    res.status(500).json({ error: msg });
  }
});

// Batch search multiple missing artists with Google Search
app.post('/api/search-artists-batch', async (req: Request, res: Response): Promise<void> => {
  const { tracks } = req.body;
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'Nessuna traccia inviata' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY non configurata' });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const results: Record<
    string,
    { artist: string; featuring: string; found: boolean; sources: Array<{ title: string; uri: string }> }
  > = {};

  for (const track of tracks) {
    try {
      const prompt = `Cerca con Google chi è l'artista o il cantante principale della canzone/brano musicale: "${track.title}".
Nome file originario: "${track.originalFilename || track.title}".

Rispondi con un oggetto JSON valido:
{
  "artist": "Nome Artista Principale",
  "featuring": "Eventuali featuring separati da virgola",
  "found": true
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';
      let parsed = { artist: '', featuring: '', found: false };
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // ignore
        }
      }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) =>
          c.web?.title ? { title: String(c.web.title), uri: String(c.web.uri || '') } : null
        )
        .filter((s): s is { title: string; uri: string } => s !== null);

      const cleanArtist = formatProperCase((parsed.artist || '').replace(/[\[\]]/g, '').trim());
      const cleanFeat = parsed.featuring
        ? parsed.featuring
            .split(/[,&/x]/i)
            .map((f: string) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
            .filter(Boolean)
            .join(', ')
        : '';

      results[track.id] = {
        artist: cleanArtist,
        featuring: cleanFeat,
        found: parsed.found ?? Boolean(cleanArtist),
        sources,
      };
    } catch {
      results[track.id] = { artist: '', featuring: '', found: false, sources: [] };
    }
  }

  res.json({ success: true, results });
});

// CLOUD SQL ARTIST DIRECTORY API ENDPOINTS
// 1. Get all known artists from Cloud SQL
app.get('/api/artists', optionalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const artists = await getKnownArtistsFromDb();
    res.json({ success: true, artists });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API /api/artists error:', msg);
    res.status(500).json({ success: false, error: msg, artists: DEFAULT_ARTISTS });
  }
});

// 2. Add new known artists to Cloud SQL (supports array or single artist object/string)
app.post('/api/artists', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { artists, artist } = req.body;
    let listToAdd: KnownArtist[] = [];

    if (Array.isArray(artists)) {
      listToAdd = artists.map((a) => {
        if (typeof a === 'string') {
          const canonical = formatProperCase(a.trim());
          return { canonical, aliases: [canonical.toLowerCase()] };
        }
        const canonical = formatProperCase((a.canonical || '').trim());
        return {
          canonical,
          aliases: Array.isArray(a.aliases) ? a.aliases : [canonical.toLowerCase()],
        };
      }).filter((a) => a.canonical.length > 0);
    } else if (typeof artist === 'string' && artist.trim()) {
      const canonical = formatProperCase(artist.trim());
      listToAdd = [{ canonical, aliases: [canonical.toLowerCase()] }];
    } else if (artist && typeof artist === 'object' && artist.canonical) {
      const canonical = formatProperCase(artist.canonical.trim());
      listToAdd = [{
        canonical,
        aliases: Array.isArray(artist.aliases) ? artist.aliases : [canonical.toLowerCase()],
      }];
    }

    if (listToAdd.length === 0) {
      res.status(400).json({ error: 'Nessun cantante valido specificato da aggiungere' });
      return;
    }

    const updated = await addKnownArtistsToDb(listToAdd);
    res.json({ success: true, count: updated.length, artists: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API POST /api/artists error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// 3. Remove artist from Cloud SQL
app.delete('/api/artists/:canonical', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const canonical = decodeURIComponent(req.params.canonical);
    if (!canonical) {
      res.status(400).json({ error: 'Nome cantante mancante' });
      return;
    }
    const updated = await removeKnownArtistFromDb(canonical);
    res.json({ success: true, artists: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API DELETE /api/artists error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// 4. Reset artists to default in Cloud SQL
app.post('/api/artists/reset', optionalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const updated = await resetKnownArtistsInDb();
    res.json({ success: true, artists: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API POST /api/artists/reset error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Windows MP3 Tagger Server avviato su http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});
