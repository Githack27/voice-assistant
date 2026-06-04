/**
 * Settings Router
 *
 * Endpoints for managing application settings and configuration.
 * Handles:
 * - Retrieving public configuration (Twilio/Vapi numbers)
 * - Getting specific settings (with defaults if not in database)
 * - Saving/updating settings
 */

import { Router, Request, Response } from 'express';
import { getRepository } from '../database/database.js';
import { ReceptionistSetting } from '../models/ReceptionistSetting.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validation.js';
import { settingSchema } from '../schemas/validation.js';
import { NotFoundError } from '../utils/errors.js';
import { DEFAULT_SETTINGS } from '../services/defaultSettings.js';
import { config } from '../config/config.js';

const router = Router();

/**
 * GET /api/settings/public/config
 * Retrieve non-sensitive public configuration
 *
 * Returns:
 * - twilio_phone_number: Twilio phone number for inbound calls
 * - vapi_phone_number_id: Vapi phone number ID for outbound calls
 * - vapi_connected: Boolean indicating if Vapi API key is configured
 */
router.get(
  '/public/config',
  asyncHandler(async (req: Request, res: Response) => {
    // Check if Vapi is properly connected (API key is configured)
    const vapiConnected =
      config.vapi.apiKey &&
      config.vapi.apiKey !== 'vapi_api_key_placeholder';

    res.json({
      twilio_phone_number:
        config.twilio.phoneNumber || '+1 (Unknown Twilio Number)',
      vapi_phone_number_id: config.vapi.phoneNumberId,
      vapi_connected: vapiConnected,
    });
  })
);

/**
 * GET /api/settings/:key
 * Retrieve a specific setting by key
 *
 * If setting doesn't exist in database, returns default value if available.
 * This ensures frontend loads seamlessly even on first run.
 *
 * Parameters:
 * - key: Setting identifier (e.g., 'agent_config', 'faqs')
 */
router.get(
  '/:key',
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    // Try to get setting from database
    const settingRepository = getRepository(ReceptionistSetting);
    let setting = await settingRepository.findOne({ where: { key } });

    // If not found but has default, return default
    if (!setting) {
      const defaultValue = (DEFAULT_SETTINGS as Record<string, any>)[key];
      
      if (defaultValue) {
        return res.json({
          key,
          value: defaultValue,
          updatedAt: new Date(),
          isDefault: true,
        });
      }

      // No database entry and no default available
      throw new NotFoundError(
        `Setting '${key}' not found and no default available`
      );
    }

    res.json(setting);
  })
);

/**
 * POST /api/settings
 * Create or update a setting
 *
 * Request Body:
 * - key: Setting identifier
 * - value: JSON object with setting data
 *
 * If setting exists, it's updated. Otherwise, a new one is created.
 */
router.post(
  '',
  validateBody(settingSchema.create),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, value } = req.body;

    const settingRepository = getRepository(ReceptionistSetting);
    
    // Check if setting already exists
    let setting = await settingRepository.findOne({ where: { key } });

    if (setting) {
      // Update existing setting
      setting.value = value;
      await settingRepository.save(setting);
    } else {
      // Create new setting
      setting = settingRepository.create({ key, value });
      await settingRepository.save(setting);
    }

    res.status(setting ? 200 : 201).json(setting);
  })
);

export default router;
