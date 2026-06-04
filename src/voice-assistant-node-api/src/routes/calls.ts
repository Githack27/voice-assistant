/**
 * Calls Router
 *
 * Endpoints for managing voice assistant calls.
 * Handles:
 * - Listing all calls with pagination
 * - Getting detailed call information
 * - Creating new call records
 * - Updating call status and metadata
 * - Adding transcripts and voicemails to calls
 */

import { Router, Request, Response } from 'express';
import { getRepository } from '../database/database.js';
import { Call } from '../models/Call.js';
import { Transcript } from '../models/Transcript.js';
import { Voicemail } from '../models/Voicemail.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validation.js';
import { callSchema, transcriptSchema, voicemailSchema } from '../schemas/validation.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/calls
 * Retrieve paginated list of calls ordered by most recent first
 *
 * Query Parameters:
 * - skip: Number of records to skip (default: 0)
 * - limit: Number of records to return (default: 100)
 */
router.get(
  '',
  asyncHandler(async (req: Request, res: Response) => {
    // Parse pagination parameters
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    // Query calls from database with pagination
    const callRepository = getRepository(Call);
    const [calls, total] = await callRepository.findAndCount({
      order: { startTime: 'DESC' }, // Most recent first
      skip,
      take: limit,
      relations: ['client', 'transcripts', 'voicemails'],
    });

    res.json({
      data: calls,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total,
      },
    });
  })
);

/**
 * GET /api/calls/:id
 * Retrieve detailed information about a specific call
 * Includes all transcripts and voicemails
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Query call with all related data
    const callRepository = getRepository(Call);
    const call = await callRepository.findOne({
      where: { id },
      relations: ['client', 'transcripts', 'voicemails'],
    });

    if (!call) {
      throw new NotFoundError(`Call with ID ${id} not found`);
    }

    res.json(call);
  })
);

/**
 * POST /api/calls
 * Create a new call record
 *
 * Request Body:
 * - clientId: UUID of client (optional, for known callers)
 * - status: Call status (default: 'ongoing')
 * - recordingUrl: URL to recording (optional)
 * - summary: AI-generated summary (optional)
 */
router.post(
  '',
  validateBody(callSchema.create),
  asyncHandler(async (req: Request, res: Response) => {
    const callData = req.body;

    // Create new call record
    const callRepository = getRepository(Call);
    const newCall = callRepository.create(callData);
    await callRepository.save(newCall);

    res.status(201).json(newCall);
  })
);

/**
 * PUT /api/calls/:id
 * Update call information (status, duration, recording, etc.)
 *
 * Request Body:
 * - endTime: When call ended
 * - durationSeconds: Call duration
 * - status: Current status
 * - recordingUrl: Recording URL
 * - summary: Call summary
 */
router.put(
  '/:id',
  validateBody(callSchema.update),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Find and update call
    const callRepository = getRepository(Call);
    const call = await callRepository.findOne({ where: { id } });

    if (!call) {
      throw new NotFoundError(`Call with ID ${id} not found`);
    }

    // Apply updates to call object
    Object.assign(call, updateData);
    await callRepository.save(call);

    res.json(call);
  })
);

/**
 * POST /api/calls/:id/transcripts
 * Add a transcript line to a call
 *
 * Request Body:
 * - speaker: Who spoke ('agent' or caller identifier)
 * - text: What was said
 */
router.post(
  '/:id/transcripts',
  validateBody(transcriptSchema.create),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const transcriptData = req.body;

    // Verify call exists
    const callRepository = getRepository(Call);
    const call = await callRepository.findOne({ where: { id } });

    if (!call) {
      throw new NotFoundError(`Call with ID ${id} not found`);
    }

    // Create transcript line
    const transcriptRepository = getRepository(Transcript);
    const transcript = transcriptRepository.create({
      ...transcriptData,
      callId: id,
    });
    await transcriptRepository.save(transcript);

    res.status(201).json(transcript);
  })
);

/**
 * POST /api/calls/:id/voicemails
 * Add a voicemail to a call
 *
 * Request Body:
 * - audioUrl: URL to voicemail audio file
 * - transcript: Transcribed text (optional)
 * - isRead: Whether voicemail has been reviewed (default: false)
 */
router.post(
  '/:id/voicemails',
  validateBody(voicemailSchema.create),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const voicemailData = req.body;

    // Verify call exists
    const callRepository = getRepository(Call);
    const call = await callRepository.findOne({ where: { id } });

    if (!call) {
      throw new NotFoundError(`Call with ID ${id} not found`);
    }

    // Create voicemail record
    const voicemailRepository = getRepository(Voicemail);
    const voicemail = voicemailRepository.create({
      ...voicemailData,
      callId: id,
    });
    await voicemailRepository.save(voicemail);

    res.status(201).json(voicemail);
  })
);

export default router;
