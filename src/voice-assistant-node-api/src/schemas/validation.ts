/**
 * Request/Response Validation Schemas
 *
 * Uses Joi for data validation. These schemas ensure type safety and valid data
 * before entering business logic. Provides clear error messages for invalid requests.
 */

import Joi from 'joi';

/**
 * ====== CLIENT SCHEMAS ======
 */

/**
 * Validates client creation/update requests
 * Ensures phone number is present and email (if provided) is valid
 */
export const clientSchema = {
  create: Joi.object({
    phoneNumber: Joi.string().required().max(20),
    name: Joi.string().optional().max(100).allow(null),
    email: Joi.string().optional().email().max(255).allow(null),
  }),
  update: Joi.object({
    name: Joi.string().optional().max(100).allow(null),
    email: Joi.string().optional().email().max(255).allow(null),
  }),
};

/**
 * ====== CALL SCHEMAS ======
 */

/**
 * Validates call creation request
 * client_id is optional for calls from unknown numbers
 */
export const callSchema = {
  create: Joi.object({
    clientId: Joi.string().uuid().optional().allow(null),
    status: Joi.string().default('ongoing'),
    recordingUrl: Joi.string().optional().allow(null),
    summary: Joi.string().optional().allow(null),
  }),
  update: Joi.object({
    endTime: Joi.date().optional().allow(null),
    durationSeconds: Joi.number().integer().optional().allow(null),
    status: Joi.string().optional().allow(null),
    recordingUrl: Joi.string().optional().allow(null),
    summary: Joi.string().optional().allow(null),
  }),
};

/**
 * ====== TRANSCRIPT SCHEMAS ======
 */

/**
 * Validates transcript creation request
 * Speaker identifies who said it ('agent' or caller identifier)
 * Text is required and must not be empty
 */
export const transcriptSchema = {
  create: Joi.object({
    speaker: Joi.string().required().max(50),
    text: Joi.string().required(),
  }),
};

/**
 * ====== VOICEMAIL SCHEMAS ======
 */

/**
 * Validates voicemail creation request
 * audioUrl is required (URL to the voicemail audio file)
 * transcript and isRead are optional
 */
export const voicemailSchema = {
  create: Joi.object({
    audioUrl: Joi.string().required().max(512),
    transcript: Joi.string().optional().allow(null),
    isRead: Joi.boolean().default(false),
  }),
};

/**
 * ====== SETTINGS SCHEMAS ======
 */

/**
 * Validates receptionist setting updates
 * key: identifier for the setting
 * value: flexible JSON object (validated application-specific)
 */
export const settingSchema = {
  create: Joi.object({
    key: Joi.string().required().max(100),
    value: Joi.object().required(),
  }),
};

/**
 * ====== VAPI SCHEMAS ======
 */

/**
 * Validates outbound call trigger request
 * phone: valid phone number to call
 */
export const vapiCallSchema = {
  outbound: Joi.object({
    phone: Joi.string().required(),
  }),
};
