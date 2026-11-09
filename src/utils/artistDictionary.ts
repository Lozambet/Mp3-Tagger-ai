/**
 * Artist knowledge dictionary for ultra-accurate offline matching
 */

export interface KnownArtist {
  canonical: string;
  aliases: string[];
}

// Initial default list provided by the user + common variations
export const DEFAULT_ARTISTS: KnownArtist[] = [
  { canonical: 'Shiva', aliases: ['shiva'] },
  { canonical: 'Rondodasosa', aliases: ['rondodasosa', 'rondo da sosa', 'rondo'] },
  { canonical: 'Ava', aliases: ['ava'] },
  { canonical: 'Anna', aliases: ['anna', 'anna pepe'] },
  { canonical: 'Finesse', aliases: ['finesse'] },
  { canonical: 'Drillionare', aliases: ['drillionare'] },
  { canonical: 'Massimo Pericolo', aliases: ['massimo pericolo'] },
  { canonical: 'Simba La Rue', aliases: ['simba la rue', 'simbalarue'] },
  { canonical: 'Baby Gang', aliases: ['baby gang', 'babygang'] },
  { canonical: 'Artie 5ive', aliases: ['artie 5ive', 'artie5ive', 'artie five', 'artie'] },
  { canonical: 'Lazza', aliases: ['lazza'] },
  { canonical: 'Capo Plaza', aliases: ['capo plaza', 'capoplaza'] },
  { canonical: 'Lilcr', aliases: ['lilcr', 'lil cr'] },
  { canonical: 'Slings', aliases: ['slings'] },
  { canonical: 'Sfera Ebbasta', aliases: ['sferaebbasta', 'sfera ebbasta', 'sfera'] },
  { canonical: 'Don Pero', aliases: ['don pero', 'donpero'] },
  { canonical: 'Boro', aliases: ['boro', 'boro boro'] },
  { canonical: 'Rhove', aliases: ['rhove'] },
  { canonical: 'Kid Yugi', aliases: ['kid yugi', 'kid jugi', 'kidyugi', 'kidjugi'] },
  { canonical: 'Gheba', aliases: ['gheba'] },
  { canonical: 'Pavè', aliases: ['pave', 'pavè', 'il pave', 'il pavè'] },
  { canonical: '22simba', aliases: ['22simba', '22 simba'] },
  { canonical: 'Geolier', aliases: ['geolier'] },
  { canonical: 'Paki', aliases: ['paki', 'paki glory'] },
  { canonical: 'Tony Effe', aliases: ['tony effe', 'tonyeffe'] },
  { canonical: 'Tony Boy', aliases: ['tony boy', 'tonyboy'] },
  { canonical: 'Glocky', aliases: ['glocky'] },
  { canonical: 'Lildombaby', aliases: ['lildombaby', 'lil dom baby'] },
  { canonical: 'Tedua', aliases: ['tedua'] },
  { canonical: 'Niky Savage', aliases: ['niky savage', 'nikysavage'] },
  { canonical: 'Neima Ezza', aliases: ['neima ezza', 'neimaezza'] },
  { canonical: 'Guè', aliases: ['guè', 'gue', 'gue pequeno', 'guè pequeno'] },
  { canonical: 'Rkomi', aliases: ['rkomi'] },
  { canonical: 'Youngest Moonstar', aliases: ['youngest moonstar', 'youngestmoonstar'] },
  { canonical: 'Dedde', aliases: ['dedde'] },
  { canonical: 'Latrelle', aliases: ['latrelle'] },
  { canonical: 'Nabi', aliases: ['nabi'] },
  { canonical: 'Blanco', aliases: ['blanco'] },
  { canonical: 'Ay Mazza', aliases: ['ay mazza', 'aymazza'] },
  { canonical: 'Sadturs', aliases: ['sadturs'] },
  { canonical: 'Kiid', aliases: ['kiid'] },
  { canonical: 'Faneto', aliases: ['faneto'] },
  { canonical: 'Melons', aliases: ['melons'] },
  { canonical: 'Blssd', aliases: ['blssd', 'blessed'] },
  // Common mainstream collaborators
  { canonical: 'Marracash', aliases: ['marracash', 'marra'] },
  { canonical: 'Salmo', aliases: ['salmo'] },
  { canonical: 'tha Supreme', aliases: ['thasup', 'tha supreme'] },
  { canonical: 'Ernia', aliases: ['ernia'] },
  { canonical: 'Rose Villain', aliases: ['rose villain'] },
  { canonical: 'Fabri Fibra', aliases: ['fabri fibra', 'fibra'] },
  { canonical: 'Noyz Narcos', aliases: ['noyz narcos', 'noyz'] },
];

const STORAGE_KEY = 'win_mp3_custom_artists_v1';
let memoryArtistsCache: KnownArtist[] | null = null;

export function getKnownArtists(): KnownArtist[] {
  if (memoryArtistsCache && memoryArtistsCache.length > 0) {
    return memoryArtistsCache;
  }
  if (typeof window === 'undefined') return DEFAULT_ARTISTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryArtistsCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed reading custom artists from localStorage:', err);
  }
  memoryArtistsCache = DEFAULT_ARTISTS;
  return DEFAULT_ARTISTS;
}

export function saveKnownArtists(artists: KnownArtist[]): void {
  memoryArtistsCache = artists;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artists));
  } catch (err) {
    console.warn('Failed saving custom artists to localStorage:', err);
  }
}

export function addKnownArtist(name: string): KnownArtist[] {
  const current = getKnownArtists();
  const trimmed = name.trim();
  if (!trimmed) return current;

  const normalized = trimmed.toLowerCase();
  const exists = current.some(
    (a) =>
      a.canonical.toLowerCase() === normalized ||
      a.aliases.some((al) => al.toLowerCase() === normalized)
  );

  if (exists) return current;

  const newEntry: KnownArtist = {
    canonical: formatProperCase(trimmed),
    aliases: [normalized, normalized.replace(/\s+/g, '')],
  };

  const updated = [...current, newEntry];
  saveKnownArtists(updated);
  return updated;
}

export function removeKnownArtist(canonicalName: string): KnownArtist[] {
  const current = getKnownArtists();
  const updated = current.filter(
    (a) => a.canonical.toLowerCase() !== canonicalName.toLowerCase()
  );
  saveKnownArtists(updated);
  return updated;
}

export function resetDefaultArtists(): KnownArtist[] {
  saveKnownArtists(DEFAULT_ARTISTS);
  return DEFAULT_ARTISTS;
}

// Cloud SQL PostgreSQL Synchronization Methods
export async function fetchKnownArtistsFromCloud(): Promise<KnownArtist[]> {
  try {
    const res = await fetch('/api/artists');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.artists) && data.artists.length > 0) {
        saveKnownArtists(data.artists);
        return data.artists;
      }
    }
  } catch (err) {
    console.warn('Cloud SQL fetch failed, using local/cached artists:', err);
  }
  return getKnownArtists();
}

export async function saveBatchArtistsToCloud(artists: string[] | KnownArtist[]): Promise<KnownArtist[]> {
  try {
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artists }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.artists)) {
        saveKnownArtists(data.artists);
        return data.artists;
      }
    }
  } catch (err) {
    console.error('Failed to save artists to Cloud SQL:', err);
  }
  // Local fallback
  for (const item of artists) {
    const name = typeof item === 'string' ? item : item.canonical;
    addKnownArtist(name);
  }
  return getKnownArtists();
}

export async function removeArtistFromCloud(canonicalName: string): Promise<KnownArtist[]> {
  try {
    const res = await fetch(`/api/artists/${encodeURIComponent(canonicalName)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.artists)) {
        saveKnownArtists(data.artists);
        return data.artists;
      }
    }
  } catch (err) {
    console.error('Failed removing artist from Cloud SQL:', err);
  }
  return removeKnownArtist(canonicalName);
}

export async function resetArtistsInCloud(): Promise<KnownArtist[]> {
  try {
    const res = await fetch('/api/artists/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.artists)) {
        saveKnownArtists(data.artists);
        return data.artists;
      }
    }
  } catch (err) {
    console.error('Failed resetting artists in Cloud SQL:', err);
  }
  return resetDefaultArtists();
}

/**
 * Checks a list of newly extracted artists and returns those not yet in the Cloud SQL database
 */
export function findUnknownArtists(
  detectedArtists: string[],
  knownList: KnownArtist[] = getKnownArtists()
): string[] {
  const unknownList: string[] = [];

  for (const raw of detectedArtists) {
    if (!raw) continue;
    const trimmed = formatProperCase(raw.trim());
    const lower = trimmed.toLowerCase();

    // Ignore placeholder names
    if (
      !trimmed ||
      lower === 'artista' ||
      lower === 'artista sconosciuto' ||
      lower === 'unknown' ||
      lower === 'unknown artist' ||
      lower === 'canzone'
    ) {
      continue;
    }

    const isKnown = knownList.some(
      (k) =>
        k.canonical.toLowerCase() === lower ||
        k.aliases.some((al) => al.toLowerCase() === lower)
    );

    if (!isKnown && !unknownList.some((u) => u.toLowerCase() === lower)) {
      unknownList.push(trimmed);
    }
  }

  return unknownList;
}

interface MatchResult {
  artist: string;
  index: number;
  length: number;
  alias: string;
}

/**
 * Intelligent dictionary matcher that recognizes known singers in text,
 * sorts by longest alias match first, and extracts primary artist, featuring,
 * and the remaining song title.
 */
export function formatProperCase(str: string): string {
  if (!str) return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const words = trimmed.split(' ');
  return words
    .map((word, index) => {
      if (!word) return '';

      // Check if word has apostrophes like l'amore, d'oro, un'altra
      if (word.includes("'")) {
        const subParts = word.split("'");
        return subParts
          .map((sub, sIdx) => {
            if (!sub) return '';
            const subLetters = sub.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ]/g, '');
            // First sub-word at index 0 of the string
            if (index === 0 && sIdx === 0) {
              return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
            }
            // 1-2 letters inside phrase: lowercase
            if (subLetters.length <= 2) {
              return sub.toLowerCase();
            }
            return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
          })
          .join("'");
      }

      // Check purely alphabetical/alphanumeric length
      const lettersOnly = word.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ]/g, '');

      // First word of the title or artist name is always capitalized
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }

      // Words of 1-2 letters in the middle are lowercase (e.g. "di", "a", "da", "in", "su", "il", "la", "e", "o", "of", "to")
      if (lettersOnly.length <= 2) {
        return word.toLowerCase();
      }

      // Words > 2 letters start with a capital letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function findKnownArtist(name: string, artistsList: KnownArtist[]): KnownArtist | null {
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  return (
    artistsList.find(
      (a) =>
        a.canonical.toLowerCase() === norm ||
        a.aliases.some((al) => al.toLowerCase() === norm)
    ) || null
  );
}

/**
 * Intelligent dictionary matcher that:
 * 1. Strictly formats titles and artists in Title Case, with 1-2 letter words in lowercase.
 * 2. Removes ANY artist references from the song title.
 * 3. Handles patterns like "TITLE (feat. ARTIST) - MAIN_ARTIST, GUEST.mp3"
 */
export function extractArtistsAndTitle(
  rawFilename: string,
  artistsList = getKnownArtists()
): {
  title: string;
  artist: string;
  featuring: string;
  matchedFromDict: boolean;
} {
  let cleaned = rawFilename.replace(/\.mp3$/i, '').trim();

  // 1. Extract bracketed featuring tags like (feat. LILCR), [ft. Shiva], (feat._sadturs), (featuring...)
  const extractedFeats: string[] = [];
  let featWasInPartA = false;
  let featWasInPartB = false;

  const bracketFeatRegex = /[\(\[][\s._]*(?:feat\.?|ft\.?|featuring)[\s._]+([^\]\)]+)[\)\]]/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bracketFeatRegex.exec(cleaned)) !== null) {
    const featStr = bMatch[1].replace(/^[._\s]+|[._\s]+$/g, '').trim();
    if (featStr) {
      const splitFeats = featStr.split(/[,;&/x]/i).map((s) => s.trim().replace(/^[._\s]+|[._\s]+$/g, '')).filter(Boolean);
      extractedFeats.push(...splitFeats);
    }
  }

  // Check if feat was in partA or partB before stripping
  const firstHyphenIdx = cleaned.indexOf(' - ') !== -1 ? cleaned.indexOf(' - ') : cleaned.indexOf('-');
  if (firstHyphenIdx !== -1) {
    const beforeHyphen = cleaned.substring(0, firstHyphenIdx);
    const afterHyphen = cleaned.substring(firstHyphenIdx);
    if (/[\(\[][\s._]*(?:feat\.?|ft\.?|featuring)/i.test(beforeHyphen)) {
      featWasInPartA = true;
    }
    if (/[\(\[][\s._]*(?:feat\.?|ft\.?|featuring)/i.test(afterHyphen)) {
      featWasInPartB = true;
    }
  }

  cleaned = cleaned.replace(bracketFeatRegex, ' ');

  // 2. Remove standard brackets with junk words (Official Video, Audio, HQ, etc.)
  cleaned = cleaned.replace(/\[[^\]]*\]/gi, ' ');
  cleaned = cleaned.replace(/\((?!feat\b|ft\b)[^)]*\)/gi, ' ');
  cleaned = cleaned.replace(/[\[\]\(\)]/g, ' ');

  // 3. Strip leading track numbers like "01 - ", "03_", "12."
  cleaned = cleaned.replace(/^(\d{1,3}[\s._-]+)/, '');

  // 4. Remove common download / quality junk words
  cleaned = cleaned.replace(
    /\b(official\s*(video|audio|music\s*video|lyric\s*video)|hq|hd|320kbps|128kbps|256kbps|4k|remastered|remaster|rip|audio|yt2mp3|lyrics|video)\b/gi,
    ' '
  );

  // Normalize spaces and underscores
  cleaned = cleaned.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

  // Check if string contains standard divider
  let partA = '';
  let partB = '';
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    partA = parts[0].trim();
    partB = parts.slice(1).join(' - ').trim();
  } else if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    partA = parts[0].trim();
    partB = parts.slice(1).join('-').trim();
  }

  let artistSide = '';
  let titleSide = '';
  let matchedFromDict = false;

  if (partA && partB) {
    const countMatches = (text: string) => {
      const lower = text.toLowerCase();
      let count = 0;
      for (const item of artistsList) {
        if (
          lower === item.canonical.toLowerCase() ||
          item.aliases.some((al) => lower === al.toLowerCase() || lower.includes(` ${al.toLowerCase()} `) || lower.startsWith(`${al.toLowerCase()} `) || lower.endsWith(` ${al.toLowerCase()}`))
        ) {
          count++;
        }
      }
      return count;
    };

    const matchesA = countMatches(partA);
    const matchesB = countMatches(partB);
    const hasArtistDelimitersB = /[,&/x]|\bfeat\b|\bft\b/i.test(partB);
    const hasArtistDelimitersA = /[,&/x]|\bfeat\b|\bft\b/i.test(partA);

    // If one part contained (feat. ...), standard convention is that (feat. ...) is attached to the Title!
    if (featWasInPartA && !featWasInPartB) {
      // e.g. "KICHTA LOVA (feat. LILCR) - Nabi, LILCR" -> partA is title, partB is artist
      titleSide = partA;
      artistSide = partB;
      matchedFromDict = matchesB > 0;
    } else if (featWasInPartB && !featWasInPartA) {
      // e.g. "Artie 5ive - Cadillac (feat. Sadturs)" -> partB is title, partA is artist
      titleSide = partB;
      artistSide = partA;
      matchedFromDict = matchesA > 0;
    } else if (matchesB > matchesA || (matchesB > 0 && !matchesA)) {
      // e.g. "KICHTA LOVA - Nabi, LILCR" or "DETENUTO - Simba La Rue"
      artistSide = partB;
      titleSide = partA;
      matchedFromDict = true;
    } else if (matchesA > matchesB || (matchesA > 0 && !matchesB)) {
      // e.g. "Nabi, LILCR - KICHTA LOVA" or "Artie 5ive - Cadillac"
      artistSide = partA;
      titleSide = partB;
      matchedFromDict = true;
    } else if (hasArtistDelimitersB && !hasArtistDelimitersA) {
      artistSide = partB;
      titleSide = partA;
    } else if (hasArtistDelimitersA && !hasArtistDelimitersB) {
      artistSide = partA;
      titleSide = partB;
    } else {
      // Default convention: "Artist - Title"
      artistSide = partA;
      titleSide = partB;
    }
  } else {
    // No hyphen: search for known artist in the full string
    const lowerText = cleaned.toLowerCase();
    for (const item of artistsList) {
      for (const alias of [item.canonical, ...item.aliases]) {
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerText)) {
          artistSide = item.canonical;
          titleSide = cleaned.replace(regex, ' ').trim();
          matchedFromDict = true;
          break;
        }
      }
      if (artistSide) break;
    }
    if (!artistSide) {
      titleSide = cleaned;
    }
  }

  // Parse artist side
  // Check for inline feat in artist side: e.g. "Nabi feat. Lilcr" or "Shiva ft Sfera"
  const inlineFeatRegex = /\b(?:feat\.?|ft\.?|featuring)\s+(.+)$/i;
  const inlineFeatMatch = artistSide.match(inlineFeatRegex);
  if (inlineFeatMatch) {
    const featStr = inlineFeatMatch[1].trim();
    if (featStr) {
      const splitFeats = featStr.split(/[,;&/x]/i).map((s) => s.trim()).filter(Boolean);
      extractedFeats.push(...splitFeats);
    }
    artistSide = artistSide.replace(inlineFeatRegex, ' ').trim();
  }

  // Split multiple artists separated by commas, &, x, /, ;: e.g. "Nabi, LILCR" or "Gheba; Pavè"
  const rawArtistTokens = artistSide
    .split(/[,;&/x]/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let primaryArtist = rawArtistTokens[0] || '';
  if (rawArtistTokens.length > 1) {
    // Subsequent artists become featuring
    extractedFeats.push(...rawArtistTokens.slice(1));
  }

  // Check inline feat inside title side as well if any remain: e.g. "Kichta Lova feat. Lilcr"
  const titleInlineFeat = titleSide.match(inlineFeatRegex);
  if (titleInlineFeat) {
    const featStr = titleInlineFeat[1].trim();
    if (featStr) {
      const splitFeats = featStr.split(/[,&/x]/i).map((s) => s.trim()).filter(Boolean);
      extractedFeats.push(...splitFeats);
    }
    titleSide = titleSide.replace(inlineFeatRegex, ' ').trim();
  }

  // Standardize primary artist with dictionary if known
  if (
    primaryArtist &&
    primaryArtist.toLowerCase() !== 'artista' &&
    primaryArtist.toLowerCase() !== 'artista sconosciuto' &&
    primaryArtist.toLowerCase() !== 'unknown'
  ) {
    const known = findKnownArtist(primaryArtist, artistsList);
    if (known) {
      primaryArtist = known.canonical;
      matchedFromDict = true;
    } else {
      primaryArtist = formatProperCase(primaryArtist);
    }
  } else {
    primaryArtist = '';
  }

  // Standardize featuring artists, deduplicate, and remove self-featuring
  const cleanFeatList: string[] = [];
  const primaryLower = primaryArtist.toLowerCase();

  for (const rawFeat of extractedFeats) {
    const trimmed = rawFeat.trim();
    if (!trimmed) continue;
    const known = findKnownArtist(trimmed, artistsList);
    const canonicalFeat = known ? known.canonical : formatProperCase(trimmed);

    if (canonicalFeat.toLowerCase() === primaryLower) {
      continue; // Skip if same as primary artist
    }
    if (!cleanFeatList.some((f) => f.toLowerCase() === canonicalFeat.toLowerCase())) {
      cleanFeatList.push(canonicalFeat);
    }
  }

  // RULE 2: THE TITLE MUST NOT CONTAIN REFERENCES TO ARTISTS
  let cleanTitle = titleSide;

  // Remove primary artist and any aliases from title
  const artistsToRemove = [primaryArtist, ...cleanFeatList];
  for (const art of artistsToRemove) {
    if (!art) continue;
    const escaped = art.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanTitle = cleanTitle.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
  }

  // Remove any remaining explicit feat keywords
  cleanTitle = cleanTitle
    .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ' ')
    .replace(/^[\s\-_,.:]+/, '')
    .replace(/[\s\-_,.:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title was wiped because it was identical to artist, recover
  if (!cleanTitle) {
    cleanTitle = titleSide || 'Canzone';
  }

  // Format title strictly in Title Case (1-2 letter words lowercase unless first word)
  const finalTitle = formatProperCase(cleanTitle) || 'Canzone';

  return {
    title: finalTitle,
    artist: primaryArtist,
    featuring: cleanFeatList.join(', '),
    matchedFromDict,
  };
}
