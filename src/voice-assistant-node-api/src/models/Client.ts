/**
 * Client Entity Model
 *
 * Represents a customer/client who has called the voice assistant.
 * Stores contact information and timestamps for tracking caller history.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Call } from './Call.js';

@Entity('clients')
export class Client {
  /**
   * Unique identifier for the client
   * UUID format for distributed system compatibility
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Phone number of the client
   * Unique constraint to prevent duplicate phone numbers
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber!: string;

  /**
   * Name of the client (optional)
   * Can be populated from caller ID or manual entry
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  /**
   * Email address of the client (optional)
   * Used for follow-up communications and notifications
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /**
   * Timestamp when the client record was created
   * Automatically set to current time on insert
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Timestamp when the client record was last updated
   * Automatically updated on each modification
   */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * One-to-many relationship with Call entity
   * A client can have multiple calls
   */
  @OneToMany(() => Call, (call) => call.client)
  calls!: Call[];
}
