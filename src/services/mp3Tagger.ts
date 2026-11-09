import { ID3Writer } from 'browser-id3-writer';
import JSZip from 'jszip';
import { extractArtistsAndTitle, formatProperCase } from '../utils/artistDictionary';

export interface TrackMetadata {
  id: string;
  originalFile: File;
  originalFilename: string;
  fileSize: number;
  status: 'pending' | 'analyzing' | 'tagging' | 'completed' | 'error';
  source?: 'local' | 'ai';
  errorMessage?: string;

  // Tag metadata
  title: string;
  artist: string;
  featuring: string;
  album: string;
  year: string;
  genre: string;
  suggestedFilename: string;

  // Processed Output
  processedBlob?: Blob;
  processedUrl?: string;

  // Audio preview
  audioUrl?: string;
  duration?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  file?: string;
  message: string;
  details?: string;
}

/**
 * Builds the clean filename without brackets:
 * "Nome Canzone - Artista Principale.mp3" or "Nome Canzone - Artista Principale Feat. Featuring.mp3"
 */
export function buildFilename(title: string, artist: string, featuring?: string): string {
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

  const base = cleanFeat
    ? `${cleanTitle} - ${cleanArtist} Feat. ${cleanFeat}`
    : `${cleanTitle} - ${cleanArtist}`;

  return `${base}.mp3`;
}

/**
 * Builds the ID3 metadata tag for artists separated by semicolons:
 * e.g. "Gheba; Pavè" or "Nabi; Lilcr"
 * Windows Explorer and standard media players use semicolon ("; ") to recognize multiple contributing artists.
 */
export function buildSeparatedArtistsTag(artist: string, featuring?: string): string {
  const rawArtist = (artist || '').replace(/[\[\]]/g, '').trim();
  const cleanArtist =
    rawArtist.toLowerCase() === 'artista' || rawArtist.toLowerCase() === 'artista sconosciuto'
      ? ''
      : formatProperCase(rawArtist);

  if (!featuring || !featuring.trim()) {
    return cleanArtist;
  }

  const cleanFeats = featuring
    .split(/[,;&/]|(?:\bfeat\.?\b|\bft\.?\b)/i)
    .map((f) => formatProperCase(f.replace(/[\[\]]/g, '').trim()))
    .filter(Boolean);

  const allArtists = [cleanArtist, ...cleanFeats];
  // Deduplicate case-insensitively while preserving order
  const seen = new Set<string>();
  const uniqueArtists: string[] = [];
  for (const art of allArtists) {
    const lower = art.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueArtists.push(art);
    }
  }

  return uniqueArtists.join('; ');
}

/**
 * Ultra-fast local client-side heuristic parser with Artist Knowledge Dictionary (<3ms per file)
 */
export function fastLocalParse(
  rawFilename: string,
  existingTags?: { title?: string; artist?: string; album?: string }
): {
  title: string;
  artist: string;
  featuring: string;
  album: string;
  year: string;
  genre: string;
  suggestedFilename: string;
} {
  // If tags exist in ID3v1/v2, clean and parse them through artist extraction
  if (
    existingTags?.title &&
    existingTags?.artist &&
    !existingTags.title.toLowerCase().includes('.mp3') &&
    existingTags.title.trim().length > 1
  ) {
    const rawTagString = `${existingTags.title} - ${existingTags.artist}`;
    const extracted = extractArtistsAndTitle(rawTagString);
    const album = existingTags.album ? formatProperCase(existingTags.album.replace(/[\[\]]/g, '').trim()) : '';
    const suggestedFilename = buildFilename(extracted.title, extracted.artist, extracted.featuring);

    return {
      title: extracted.title,
      artist: extracted.artist,
      featuring: extracted.featuring,
      album,
      year: '',
      genre: '',
      suggestedFilename,
    };
  }

  // Use intelligent artist dictionary extractor on filename
  const extracted = extractArtistsAndTitle(rawFilename);
  const album = existingTags?.album ? formatProperCase(existingTags.album.replace(/[\[\]]/g, '').trim()) : '';
  const suggestedFilename = buildFilename(extracted.title, extracted.artist, extracted.featuring);

  return {
    title: extracted.title,
    artist: extracted.artist,
    featuring: extracted.featuring,
    album,
    year: '',
    genre: '',
    suggestedFilename,
  };
}

/**
 * Basic ID3v1 / ID3v2 tag reader in browser from first/last bytes
 */
export async function readBasicTags(file: File): Promise<{
  title?: string;
  artist?: string;
  album?: string;
}> {
  try {
    if (file.size > 128) {
      const slice = file.slice(file.size - 128, file.size);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const header = String.fromCharCode(...bytes.slice(0, 3));
      if (header === 'TAG') {
        const title = decodeString(bytes.slice(3, 33)).trim();
        const artist = decodeString(bytes.slice(33, 63)).trim();
        const album = decodeString(bytes.slice(63, 93)).trim();
        return {
          title: title ? title.replace(/[\[\]]/g, '') : undefined,
          artist: artist ? artist.replace(/[\[\]]/g, '') : undefined,
          album: album ? album.replace(/[\[\]]/g, '') : undefined,
        };
      }
    }
  } catch (err) {
    console.debug('No ID3v1 tag found or read failed:', err);
  }
  return {};
}

function decodeString(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) break;
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

/**
 * Clean existing ID3 tags from audio stream to prevent corrupted duplicate tags
 */
export function stripExistingID3(arrayBuffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(arrayBuffer);
  let startOffset = 0;
  let endOffset = bytes.length;

  // Check ID3v2 at start: 'ID3' (0x49, 0x44, 0x33)
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    startOffset = 10 + size;
    // Check if footer present (flag byte bit 4: 0x10)
    if (bytes[5] & 0x10) {
      startOffset += 10;
    }
  }

  // Check ID3v1 at end: 'TAG' (0x54, 0x41, 0x47)
  if (endOffset - startOffset > 128) {
    const tail = endOffset - 128;
    if (bytes[tail] === 0x54 && bytes[tail + 1] === 0x41 && bytes[tail + 2] === 0x47) {
      endOffset = tail;
    }
  }

  if (startOffset > 0 || endOffset < bytes.length) {
    return arrayBuffer.slice(startOffset, endOffset);
  }
  return arrayBuffer;
}

/**
 * Creates standard 128-byte ID3v1.1 tag block recognized natively by Windows Explorer
 */
export function createID3v1Tag(
  title: string,
  artist: string,
  album: string,
  year: string
): Uint8Array {
  const buf = new Uint8Array(128);
  // 'TAG' header
  buf[0] = 0x54;
  buf[1] = 0x41;
  buf[2] = 0x47;

  const writeLatin1 = (str: string, offset: number, maxLen: number) => {
    if (!str) return;
    for (let i = 0; i < Math.min(str.length, maxLen); i++) {
      const code = str.charCodeAt(i);
      buf[offset + i] = code <= 255 ? code : 63;
    }
  };

  writeLatin1(title, 3, 30);
  writeLatin1(artist, 33, 30);
  // Never invent album or year. If empty, leave as 0 bytes.
  if (album) {
    writeLatin1(album, 63, 30);
  }
  if (year) {
    writeLatin1(year, 93, 4);
  }
  writeLatin1('Windows MP3 Tagger', 97, 28);
  buf[125] = 0; // ID3v1.1 flag
  buf[126] = 1; // Track 1
  buf[127] = 255; // Default genre byte
  return buf;
}

/**
 * Embed ID3v2.3 + ID3v1.1 tags into MP3 File with full Windows Explorer compatibility (<10ms)
 */
export async function embedTagsAndCreateBlob(track: TrackMetadata): Promise<Blob> {
  const originalBuffer = await track.originalFile.arrayBuffer();
  // Strip previous broken or duplicate tags to ensure clean audio data
  const cleanAudio = stripExistingID3(originalBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writer = new (ID3Writer as any)(cleanAudio);

  const cleanTitle = (track.title || 'Canzone').replace(/[\[\]]/g, '').trim();
  const cleanArtist = (track.artist || 'Artista Sconosciuto').replace(/[\[\]]/g, '').trim();
  const cleanFeat = track.featuring ? track.featuring.replace(/[\[\]]/g, '').trim() : '';

  // In ID3 metadata tags, multiple artists are separated by semicolons: "Gheba; Pavè"
  const separatedArtists = buildSeparatedArtistsTag(cleanArtist, cleanFeat);

  if (cleanTitle) {
    writer.setFrame('TIT2', cleanTitle);
  }
  if (cleanArtist) {
    // TPE1 (Contributing Artists / Lead performers): separated with semicolons (Windows Explorer standard)
    writer.setFrame('TPE1', [separatedArtists]);
    // TPE2 (Band / Album Artist): primary artist
    writer.setFrame('TPE2', cleanArtist);
  }

  // Never invent album or year: only write if user or original tags provided them!
  const cleanAlbum = (track.album || '').replace(/[\[\]]/g, '').trim();
  if (cleanAlbum) {
    writer.setFrame('TALB', cleanAlbum);
  }

  const cleanYear = (track.year || '').trim();
  if (cleanYear) {
    const parsedYear = parseInt(cleanYear, 10);
    if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear < 2100) {
      writer.setFrame('TYER', parsedYear);
    }
  }

  const cleanGenre = (track.genre || '').trim();
  if (cleanGenre) {
    writer.setFrame('TCON', [cleanGenre]);
  }

  writer.addTag();
  const id3v2TaggedBuffer = writer.arrayBuffer;

  // Append 128-byte ID3v1.1 tag at the end for universal Windows Explorer & player support (semicolon separated)
  const v1Bytes = createID3v1Tag(cleanTitle, separatedArtists, cleanAlbum, cleanYear);
  const combinedBuffer = new Uint8Array(id3v2TaggedBuffer.byteLength + 128);
  combinedBuffer.set(new Uint8Array(id3v2TaggedBuffer), 0);
  combinedBuffer.set(v1Bytes, id3v2TaggedBuffer.byteLength);

  return new Blob([combinedBuffer], { type: 'audio/mpeg' });
}

/**
 * Download a single processed file
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\[\]]/g, '');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Direct download of individual MP3 files (for 1 to 4 songs without creating a ZIP)
 */
export async function downloadDirectMp3Files(
  tracks: TrackMetadata[],
  onProgress?: (current: number, total: number, name: string) => void
): Promise<void> {
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    // Re-embed fresh metadata right at download time
    const freshBlob = await embedTagsAndCreateBlob(track);
    const filename = (
      track.suggestedFilename || buildFilename(track.title, track.artist, track.featuring)
    ).replace(/[\[\]]/g, '');

    if (onProgress) {
      onProgress(i + 1, tracks.length, filename);
    }
    downloadFile(freshBlob, filename);

    // Stagger downloads by 300ms to allow browser to trigger each download cleanly
    if (i < tracks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/**
 * Package multiple processed MP3 files into a single ZIP archive (for heavy folders > 4 files)
 */
export async function downloadAllAsZip(
  tracks: TrackMetadata[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    // Generate fresh tagged blob on-the-fly to guarantee updated metadata
    const freshBlob = await embedTagsAndCreateBlob(track);
    const cleanName = (
      track.suggestedFilename || buildFilename(track.title, track.artist, track.featuring)
    ).replace(/[\[\]]/g, '');
    zip.file(cleanName, freshBlob);
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  downloadFile(zipBlob, 'MP3_Library.zip');
}

/**
 * Helper to format file sizes
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
