/**
 * Generates lightweight valid MP3 files with realistic messy names for demo purposes
 */

// A valid minimal silent MPEG 1.0 Layer 3 audio frame sequence (128kbps, 44.1kHz stereo)
const MP3_SILENCE_FRAME = new Uint8Array([
  0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x55, 0x55, 0x55, 0x55,
  0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
  0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
  0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
]);

export function createDummyMp3File(filename: string, frameCount = 80): File {
  const frameLength = MP3_SILENCE_FRAME.length;
  const totalLength = frameLength * frameCount;
  const buffer = new Uint8Array(totalLength);

  for (let i = 0; i < frameCount; i++) {
    buffer.set(MP3_SILENCE_FRAME, i * frameLength);
  }

  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  return new File([blob], filename, { type: 'audio/mpeg' });
}

export const DEMO_FILES = [
  'Boxer.mp3',
  'KICHTA LOVA (feat. LILCR) - Nabi, LILCR.mp3',
  '01_shiva_ft_rondodasosa_auto_blu_official_audio_320kbps.mp3',
  'drillionare_sferaebbasta_lazza_10_cavallini_hq.mp3',
  'baby_gang_simba_la_rue_italiano_official_video.mp3',
  'kid_jugi_artie_5ive_tony_boy_business_remastered.mp3',
  'capo_plaza_allenamento_4_320kbps.mp3',
  'massimo_pericolo_scialla_sempre_rip.mp3',
];
