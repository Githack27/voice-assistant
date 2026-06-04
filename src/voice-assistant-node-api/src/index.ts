/**
 * Voice Assistant Node API
 * Main Entry Point
 *
 * Sets up Express server with middleware, initializes database,
 * and registers all route handlers.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase } from './database/database.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';

// Import route handlers
import callsRouter from './routes/calls.js';
import settingsRouter from './routes/settings.js';
import vapiRouter from './routes/vapi.js';

/**
 * Initialize Express application
 */
const app = express();

/**
 * ====== MIDDLEWARE SETUP ======
 */

// Parse JSON request bodies (limit to 10MB to prevent large uploads)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Enable CORS (Cross-Origin Resource Sharing)
// Allows frontend running on different domain to access API
app.use(
  cors({
    origin: '*', // In production, restrict to specific frontend domain(s)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Vapi-Secret'],
  })
);

/**
 * ====== HEALTH CHECK ENDPOINTS ======
 */

/**
 * GET /health
 * Simple health check endpoint for load balancers and monitoring
 */
app.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'healthy' });
  })
);

/**
 * GET /
 * Welcome message and API documentation link
 */
app.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      message:
        'Welcome to Voice Assistant Receptionist API',
      version: '1.0.0',
      documentation: '/api-docs', // Placeholder for future Swagger documentation
      endpoints: {
        calls: '/api/calls',
        settings: '/api/settings',
        vapi: '/api/vapi',
      },
    });
  })
);

/**
 * ====== ROUTE REGISTRATION ======
 * Register all route handlers with their prefixes
 */

app.use('/api/calls', callsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vapi', vapiRouter);

/**
 * ====== ERROR HANDLING ======
 * Must be registered after all other middleware and routes
 */
app.use(errorHandler);

/**
 * ====== SERVER STARTUP ======
 */

/**
 * Initialize database and start Express server
 */
async function startServer() {
  try {
    // Initialize database connection
    logger.info('Initializing database...');
    await initializeDatabase();

    // Start Express server
    app.listen(config.port, config.host, () => {
      logger.info(`Server running at http://${config.host}:${config.port}`);
      logger.info(
        `Environment: ${config.nodeEnv}`,
      );
      logger.info('Database synchronized and ready');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
