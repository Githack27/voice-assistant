/**
 * Transcript Entity Model
 *
 * Represents a single line of dialogue in a call transcript.
 * Stores who said what and when during the call conversation.
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

@Entity('transcripts')
export class Transcript {
  /**
   * Unique identifier for this transcript line
   * UUID format for distributed system compatibility
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Foreign key to the Call this transcript belongs to
   * Required - every transcript line must belong to a call
   */
  @Column({ type: 'uuid' })
  @ForeignKey(() => Call)
  callId!: string;

  /**
   * Many-to-one relationship with Call entity
   * Links this transcript line to its parent call
   */
  @ManyToOne(() => Call, (call) => call.transcripts, { onDelete: 'CASCADE' })
  call!: Call;

  /**
   * Who said this line ('agent' or caller's name/number)
   * Identifies whether it's from the AI assistant or the caller
   */
  @Column({ type: 'varchar', length: 50 })
  speaker!: string;

  /**
   * The actual text spoken
   * Full content of what was said
   */
  @Column({ type: 'text' })
  text!: string;

  /**
   * When this line was spoken
   * Timestamp for chronological ordering within the call
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp!: Date;
}
