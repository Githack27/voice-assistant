/**
 * Configuration Management
 *
 * This module handles all environment-based configuration using dotenv.
 * All environment variables are centralized here for type safety and consistency.
 */

import 'dotenv/config';

export const config = {
  // Server Configuration
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5434/voice_assistant',
  },

  // Vapi Configuration (AI Voice Provider)
  vapi: {
    apiKey: process.env.VAPI_API_KEY || 'vapi_api_key_placeholder',
    secretToken: process.env.VAPI_SECRET_TOKEN || 'vapi_secret_token_placeholder',
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || 'vapi_phone_number_id_placeholder',
  },

  // Twilio Configuration (Phone Provider)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'twilio_account_sid_placeholder',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'twilio_auth_token_placeholder',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1 (Unknown Twilio Number)',
  },
};

// Validate critical configuration
if (!config.database.url) {
  throw new Error('DATABASE_URL environment variable is required');
}
