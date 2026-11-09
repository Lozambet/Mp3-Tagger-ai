import { db } from './index.ts';
import { knownArtists } from './schema.ts';
import { eq } from 'drizzle-orm';
import { DEFAULT_ARTISTS, KnownArtist } from '../utils/artistDictionary.ts';

export async function getKnownArtistsFromDb(): Promise<KnownArtist[]> {
  try {
    const rows = await db.select().from(knownArtists);
    if (!rows || rows.length === 0) {
      // Seed default artists if empty
      await seedDefaultArtists();
      const freshRows = await db.select().from(knownArtists);
      return freshRows.map(rowToArtist);
    }
    return rows.map(rowToArtist);
  } catch (error) {
    console.error('Failed to get known artists from DB:', error);
    // Graceful fallback to default in-memory list
    return DEFAULT_ARTISTS;
  }
}

export async function addKnownArtistsToDb(newArtists: KnownArtist[]): Promise<KnownArtist[]> {
  try {
    for (const artist of newArtists) {
      const canonical = artist.canonical.trim();
      if (!canonical) continue;
      const aliasesJson = JSON.stringify(artist.aliases || [canonical.toLowerCase()]);

      await db
        .insert(knownArtists)
        .values({
          canonical,
          aliases: aliasesJson,
          isCustom: 1,
        })
        .onConflictDoUpdate({
          target: knownArtists.canonical,
          set: {
            aliases: aliasesJson,
          },
        });
    }

    const rows = await db.select().from(knownArtists);
    return rows.map(rowToArtist);
  } catch (error) {
    console.error('Failed to add known artists to DB:', error);
    throw new Error('Database insert failed', { cause: error });
  }
}

export async function removeKnownArtistFromDb(canonicalName: string): Promise<KnownArtist[]> {
  try {
    await db.delete(knownArtists).where(eq(knownArtists.canonical, canonicalName));
    const rows = await db.select().from(knownArtists);
    return rows.map(rowToArtist);
  } catch (error) {
    console.error('Failed to remove artist from DB:', error);
    throw new Error('Database delete failed', { cause: error });
  }
}

export async function seedDefaultArtists(): Promise<void> {
  try {
    for (const item of DEFAULT_ARTISTS) {
      await db
        .insert(knownArtists)
        .values({
          canonical: item.canonical,
          aliases: JSON.stringify(item.aliases),
          isCustom: 0,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error('Failed seeding default artists:', error);
  }
}

export async function resetKnownArtistsInDb(): Promise<KnownArtist[]> {
  try {
    await db.delete(knownArtists);
    await seedDefaultArtists();
    const rows = await db.select().from(knownArtists);
    return rows.map(rowToArtist);
  } catch (error) {
    console.error('Failed resetting artists in DB:', error);
    throw new Error('Database reset failed', { cause: error });
  }
}

function rowToArtist(row: typeof knownArtists.$inferSelect): KnownArtist {
  let aliases: string[] = [];
  try {
    aliases = JSON.parse(row.aliases);
    if (!Array.isArray(aliases)) aliases = [row.canonical.toLowerCase()];
  } catch {
    aliases = [row.canonical.toLowerCase()];
  }
  return {
    canonical: row.canonical,
    aliases,
  };
}
