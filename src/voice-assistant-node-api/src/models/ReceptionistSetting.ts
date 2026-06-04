/**
 * ReceptionistSetting Entity Model
 *
 * Stores dynamic configuration settings for the voice assistant receptionist.
 * Allows administrators to update agent behavior, FAQs, and system prompts without redeploying.
 * Uses JSONB column type for flexible, queryable JSON storage.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('receptionist_settings')
export class ReceptionistSetting {
  /**
   * Unique key identifier for this setting
   * Examples: 'agent_config', 'faqs', 'system_prompt'
   */
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  /**
   * JSON value for this setting
   * JSONB type allows flexible structure and querying
   * Example: { model: 'gemini-1.5-flash', voiceName: 'en-US-Neural-F', ... }
   */
  @Column({ type: 'jsonb' })
  value!: Record<string, any>;

  /**
   * Timestamp when this setting was last updated
   * Automatically set and updated on each modification
   */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
