/**
 * Voicemail Entity Model
 *
 * Represents a voicemail message left during a call.
 * Stores audio URL, transcript, and read status for voicemail management.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ForeignKey,
} from 'typeorm';
import { Call } from './Call.js';

@Entity('voicemails')
export class Voicemail {
  /**
   * Unique identifier for the voicemail
   * UUID format for distributed system compatibility
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Foreign key to the Call this voicemail is associated with
   * Required - every voicemail must belong to a call
   */
  @Column({ type: 'uuid' })
  @ForeignKey(() => Call)
  callId!: string;

  /**
   * Many-to-one relationship with Call entity
   * Links this voicemail to its parent call
   */
  @ManyToOne(() => Call, (call) => call.voicemails, { onDelete: 'CASCADE' })
  call!: Call;

  /**
   * URL to the audio file stored in cloud storage (S3, GCS, etc.)
   * Can be streamed or downloaded from this URL
   */
  @Column({ type: 'varchar', length: 512 })
  audioUrl!: string;

  /**
   * Transcribed text of the voicemail message
   * Optional - populated by speech-to-text service if available
   */
  @Column({ type: 'text', nullable: true })
  transcript?: string;

  /**
   * Whether the voicemail has been read/reviewed by a human
   * Defaults to false when created
   * Used to track which voicemails need attention
   */
  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  /**
   * Timestamp when the voicemail was created/received
   * Automatically set to current time on insert
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
