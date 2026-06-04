/**
 * Database Configuration
 *
 * This module initializes and manages the database connection using TypeORM.
 * It provides a connection instance and data source for all database operations.
 */

import { DataSource } from 'typeorm';
import { config } from '../config/config.js';

// Import all entity models
import { Client } from '../models/Client.js';
import { Call } from '../models/Call.js';
import { Transcript } from '../models/Transcript.js';
import { Voicemail } from '../models/Voicemail.js';
import { ReceptionistSetting } from '../models/ReceptionistSetting.js';

/**
 * TypeORM DataSource configuration
 * Manages PostgreSQL connection with automatic schema synchronization
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.database.url,
  synchronize: true, // Automatically create/update schema (use migrations in production)
  logging: config.nodeEnv === 'development',
  entities: [Client, Call, Transcript, Voicemail, ReceptionistSetting],
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize database connection
 * Must be called before starting the Express server
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database repository utility
 * Usage: const clientRepo = getRepository(Client);
 */
export function getRepository<T>(entity: new () => T) {
  return AppDataSource.getRepository(entity);
}
