/**
 * Call Entity Model
 *
 * Represents a phone call to the voice assistant.
 * Stores call metadata including duration, status, recording URL, and relationships
 * to transcripts and voicemails.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ForeignKey,
} from 'typeorm';
import { Client } from './Client.js';
import { Transcript } from './Transcript.js';
import { Voicemail } from './Voicemail.js';

@Entity('calls')
export class Call {
  /**
   * Unique identifier for the call
   * UUID format for distributed system compatibility
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Foreign key to the Client who made the call
   * Nullable to allow calls from unknown callers
   */
  @Column({ type: 'uuid', nullable: true })
  @ForeignKey(() => Client)
  clientId?: string;

  /**
   * Many-to-one relationship with Client entity
   * Links the call to the client who made it
   */
  @ManyToOne(() => Client, (client) => client.calls, { onDelete: 'SET NULL' })
  client?: Client;

  /**
   * When the call started
   * Automatically set to current time if not provided
   */
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  startTime!: Date;

  /**
   * When the call ended (null if still in progress)
   * Set when the call is completed
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  endTime?: Date;

  /**
   * Duration of the call in seconds
   * Calculated from start and end times
   */
  @Column({ type: 'integer', nullable: true })
  durationSeconds?: number;

  /**
   * Current status of the call
   * Possible values: 'ongoing', 'answered', 'needs-reply', 'failed'
   * Defaults to 'ongoing' when created
   */
  @Column({ type: 'varchar', length: 50, default: 'ongoing' })
  status!: string;

  /**
   * URL to the call recording file (if available)
   * Provided by Vapi after call completion
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  recordingUrl?: string;

  /**
   * AI-generated or manual summary of the call
   * Concise description of what was discussed
   */
  @Column({ type: 'text', nullable: true })
  summary?: string;

  /**
   * Timestamp when the call record was created
   * Automatically set to current time on insert
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Timestamp when the call record was last updated
   * Automatically updated on each modification
   */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * One-to-many relationship with Transcript entity
   * A call can have multiple transcript lines (one per speaker turn)
   * Cascading delete: transcripts are deleted when call is deleted
   */
  @OneToMany(() => Transcript, (transcript) => transcript.call, {
    cascade: true,
    eager: true,
  })
  transcripts!: Transcript[];

  /**
   * One-to-many relationship with Voicemail entity
   * A call can have voicemail(s) left by the caller
   * Cascading delete: voicemails are deleted when call is deleted
   */
  @OneToMany(() => Voicemail, (voicemail) => voicemail.call, {
    cascade: true,
    eager: true,
  })
  voicemails!: Voicemail[];
}
