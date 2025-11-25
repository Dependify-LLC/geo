import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('user'), // 'admin' | 'user'
    createdAt: timestamp('created_at').defaultNow(),
});

export const savedLocations = pgTable('saved_locations', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(), // e.g., "Abuja, Nigeria"
    primarySearchId: integer('primary_search_id'), // Link to the "Master" search that defines the canonical list
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const searches = pgTable('searches', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // Link to user
    location: text('location').notNull(),
    keyword: text('keyword').notNull(),
    status: text('status').notNull(), // 'discovering', 'scraping', 'completed', 'failed'
    phase: text('phase').default('discovering'), // 'discovering', 'ready_to_scrape', 'scraping', 'completed'
    savedLocationId: integer('saved_location_id').references(() => savedLocations.id), // Link to cached hierarchy
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
});

export const sublocations = pgTable('sublocations', {
    id: serial('id').primaryKey(),
    searchId: integer('search_id').references(() => searches.id), // Keep for backward compatibility/logging
    savedLocationId: integer('saved_location_id').references(() => savedLocations.id), // Link to master hierarchy
    name: text('name').notNull(),
    type: text('type').notNull(), // 'neighborhood', 'district', etc.
    status: text('status').default('pending'), // 'pending', 'scraping', 'completed', 'failed'
    businessCount: integer('business_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const businesses = pgTable('businesses', {
    id: serial('id').primaryKey(),
    searchId: integer('search_id').references(() => searches.id),
    sublocationId: integer('sublocation_id').references(() => sublocations.id),
    name: text('name').notNull(),
    address: text('address'),
    rating: text('rating'),
    reviewsCount: integer('reviews_count'),
    category: text('category'),
    phone: text('phone'),
    website: text('website'),
    placeId: text('place_id'),
    coordinates: text('coordinates'),
    confidence: integer('confidence').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const enrichmentData = pgTable('enrichment_data', {
    id: serial('id').primaryKey(),
    businessId: integer('business_id').references(() => businesses.id),
    status: text('status').default('pending'),
    progress: integer('progress').default(0),
    source: text('source').notNull(),
    data: text('data'),
    confidence: integer('confidence').default(50),
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
});
