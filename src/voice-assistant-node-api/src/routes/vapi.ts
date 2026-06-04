/**
 * Vapi Router
 *
 * Webhook and integration endpoints with Vapi AI voice service.
 * Handles:
 * - Webhook for end-of-call reports from Vapi
 * - Webhook for dynamic assistant configuration requests
 * - Triggering outbound calls via Vapi API
 *
 * Vapi sends webhooks for events like call completion, and requests for
 * dynamic configuration. This router processes those events and integrates
 * with our database to store call data.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getRepository } from '../database/database.js';
import { Client } from '../models/Client.js';
import { Call } from '../models/Call.js';
import { Transcript } from '../models/Transcript.js';
import { ReceptionistSetting } from '../models/ReceptionistSetting.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  UnauthorizedError,
  ExternalServiceError,
  NotFoundError,
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_SETTINGS } from '../services/defaultSettings.js';
import { config } from '../config/config.js';

const router = Router();

/**
 * Map UI model names to Vapi provider/model identifiers
 * Allows users to select friendly names in UI, which map to actual Vapi models
 */
const MODEL_MAP: Record<string, { provider: string; model: string }> = {
  'gemini-1.5-flash': { provider: 'google', model: 'gemini-1.5-flash' },
  'gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro' },
  'gpt-4o-voice': { provider: 'openai', model: 'gpt-4o' },
  'claude-haiku-4.5': {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
  },
};

/**
 * Map UI voice names to Vapi Azure voices
 * Allows users to select friendly voice names, which map to Azure Neural voices
 */
const VOICE_MAP: Record<string, { provider: string; voiceId: string }> = {
  'en-US-Neural-F': { provider: 'azure', voiceId: 'en-US-JennyNeural' },
  'en-US-Neural-M': { provider: 'azure', voiceId: 'en-US-GuyNeural' },
  'en-GB-Neural-Br': { provider: 'azure', voiceId: 'en-GB-SoniaNeural' },
  'es-ES-Neural-S': { provider: 'azure', voiceId: 'es-ES-ElviraNeural' },
};

/**
 * Helper: Fetch active assistant configuration from database
 * Merges database settings with defaults to create complete Vapi assistant payload
 */
async function getActiveAssistantConfig(): Promise<Record<string, any>> {
  const settingRepository = getRepository(ReceptionistSetting);

  // Fetch agent config from database, or use default
  let agentConfig = DEFAULT_SETTINGS.agent_config;
  const configSetting = await settingRepository.findOne({
    where: { key: 'agent_config' },
  });
  if (configSetting) {
    agentConfig = configSetting.value;
  }

  // Fetch FAQs from database, or use default
  let faqs = DEFAULT_SETTINGS.faqs;
  const faqSetting = await settingRepository.findOne({
    where: { key: 'faqs' },
  });
  if (faqSetting) {
    faqs = faqSetting.value;
  }

  // Build system prompt with FAQs
  let systemPrompt = agentConfig.systemPrompt || '';
  if (faqs && faqs.length > 0) {
    systemPrompt += '\n\nUse the following exact FAQ rules to answer questions if they are asked:\n';
    for (const faq of faqs) {
      systemPrompt += `Q: ${faq.question}\nA: ${faq.answer} (Match type: ${faq.matchRule})\n`;
    }
  }

  // Resolve model configuration
  const modelName = agentConfig.model || 'gemini-1.5-flash';
  const modelResolved =
    MODEL_MAP[modelName] ||
    MODEL_MAP['gemini-1.5-flash'];

  // Resolve voice configuration
  const voiceName = agentConfig.voiceName || 'en-US-Neural-F';
  const voiceResolved =
    VOICE_MAP[voiceName] ||
    VOICE_MAP['en-US-Neural-F'];

  return {
    firstMessage: 'Hello! Thank you for calling. How can I help you today?',
    model: {
      provider: modelResolved.provider,
      model: modelResolved.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    },
    voice: voiceResolved,
  };
}

/**
 * POST /api/vapi/webhook
 *
 * Webhook endpoint for Vapi to send events
 * Handles two main event types:
 * 1. assistant-request: Vapi asks for dynamic assistant configuration
 * 2. end-of-call-report: Vapi reports call completion and provides transcript
 *
 * Headers:
 * - x-vapi-secret: Secret token to verify webhook authenticity
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify webhook authenticity if secret is configured
    const vapiSecret = req.header('x-vapi-secret');
    if (
      config.vapi.secretToken &&
      config.vapi.secretToken !== 'vapi_secret_token_placeholder'
    ) {
      if (vapiSecret !== config.vapi.secretToken) {
        logger.warn('Unverified webhook access attempt blocked');
        throw new UnauthorizedError('Invalid Vapi secret token');
      }
    }

    const payload = req.body;
    const message = payload.message || {};
    const messageType = message.type;

    // ====== HANDLE ASSISTANT REQUEST ======
    if (messageType === 'assistant-request') {
      logger.info('Received assistant-request webhook event from Vapi');
      try {
        const assistantPayload = await getActiveAssistantConfig();
        return res.json({ assistant: assistantPayload });
      } catch (error) {
        logger.error('Error formulating dynamic assistant config', error);
        // Fall back to default on error
        return res.json({
          assistant: {
            ...DEFAULT_SETTINGS.agent_config,
          },
        });
      }
    }

    // ====== HANDLE END-OF-CALL REPORT ======
    if (messageType === 'end-of-call-report') {
      logger.info('Received end-of-call-report webhook event from Vapi');

      const callData = message.call || {};
      const customer = callData.customer || {};
      const phoneNumber = customer.number || 'Unknown Caller';

      // Get or create client
      const clientRepository = getRepository(Client);
      let client = await clientRepository.findOne({
        where: { phoneNumber },
      });

      if (!client) {
        client = clientRepository.create({
          phoneNumber,
          name: `Caller (${phoneNumber.slice(-4)})`,
          email: `caller_${phoneNumber.slice(-4)}@example.com`,
        });
        await clientRepository.save(client);
      }

      // Parse timestamps
      let startedAt = new Date();
      let endedAt = new Date();

      try {
        if (callData.startedAt) {
          startedAt = new Date(callData.startedAt);
        }
      } catch {
        logger.warn('Failed to parse startedAt timestamp');
      }

      try {
        if (callData.endedAt) {
          endedAt = new Date(callData.endedAt);
        }
      } catch {
        logger.warn('Failed to parse endedAt timestamp');
      }

      // Create call record
      const duration = parseInt(callData.duration || '0', 10);
      const summary = message.summary || 'Call completed';
      const recordingUrl = callData.recordingUrl;
      const transcript = message.transcript || '';

      // Intelligent status detection: does transcript suggest follow-up needed?
      let callStatus = 'answered';
      const followUpKeywords = ['postgres', 'schedule', 'pricing', 'invoice', 'double charge', 'discount'];
      if (
        followUpKeywords.some((keyword) =>
          transcript.toLowerCase().includes(keyword)
        )
      ) {
        callStatus = 'needs-reply';
      }

      const callRepository = getRepository(Call);
      const newCall = callRepository.create({
        clientId: client.id,
        startTime: startedAt,
        endTime: endedAt,
        durationSeconds: duration,
        status: callStatus,
        recordingUrl,
        summary,
      });
      await callRepository.save(newCall);

      // Parse and save transcript lines
      if (transcript) {
        const transcriptRepository = getRepository(Transcript);
        const lines = transcript.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.includes(':')) {
            continue; // Skip empty lines or lines without speaker
          }

          const [speaker, ...textParts] = trimmedLine.split(':');
          const text = textParts.join(':').trim();

          if (speaker && text) {
            const transcriptRecord = transcriptRepository.create({
              callId: newCall.id,
              speaker: speaker.trim(),
              text,
            });
            await transcriptRepository.save(transcriptRecord);
          }
        }
      }

      logger.info(`Call recorded: ${newCall.id} from ${phoneNumber}`);
      return res.json({
        status: 'success',
        callId: newCall.id,
      });
    }

    // Unknown message type - ignore
    return res.json({ status: 'ignored' });
  })
);

/**
 * POST /api/vapi/outbound
 *
 * Trigger an outbound phone call using Vapi API
 * This endpoint makes a request to Vapi to initiate a call to a specified number
 *
 * Request Body:
 * - phone: Phone number to call
 *
 * Returns:
 * - status: 'success'
 * - vapiCallId: ID of the call as assigned by Vapi
 *
 * Errors:
 * - 400: VAPI_API_KEY or VAPI_PHONE_NUMBER_ID not configured
 * - 502: Vapi API error
 */
router.post(
  '/outbound',
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    // Validate Vapi configuration
    if (
      !config.vapi.apiKey ||
      config.vapi.apiKey === 'vapi_api_key_placeholder'
    ) {
      throw new ExternalServiceError(
        'VAPI_API_KEY environment variable is not configured'
      );
    }

    if (
      !config.vapi.phoneNumberId ||
      config.vapi.phoneNumberId === 'vapi_phone_number_id_placeholder'
    ) {
      throw new ExternalServiceError(
        'VAPI_PHONE_NUMBER_ID is not configured. Outbound calls require a registered Vapi number.'
      );
    }

    // Get dynamic assistant configuration
    const assistantPayload = await getActiveAssistantConfig();

    // Build Vapi API request
    const vapiPayload = {
      phoneNumberId: config.vapi.phoneNumberId,
      assistant: assistantPayload,
      customer: {
        number: phone,
      },
    };

    try {
      // Call Vapi API to initiate outbound call
      const response = await axios.post(
        'https://api.vapi.ai/call',
        vapiPayload,
        {
          headers: {
            Authorization: `Bearer ${config.vapi.apiKey}`,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      logger.info(`Outbound call initiated to ${phone}`, {
        vapiCallId: response.data.id,
      });

      return res.json({
        status: 'success',
        vapiCallId: response.data.id,
      });
    } catch (error: any) {
      logger.error('Vapi outbound call failed', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      throw new ExternalServiceError(
        `Vapi outbound call failed: ${error.response?.data?.message || error.message}`
      );
    }
  })
);

export default router;
