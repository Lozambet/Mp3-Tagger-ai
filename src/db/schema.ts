import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table as required by Cloud SQL setup
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'known_artists' table for Cloud SQL storage of artists
export const knownArtists = pgTable('known_artists', {
  id: serial('id').primaryKey(),
  canonical: text('canonical').notNull().unique(),
  aliases: text('aliases').notNull(), // JSON string array of aliases
  isCustom: integer('is_custom').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
