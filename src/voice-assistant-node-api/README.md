# Voice Assistant Node API

A Node.js and Express implementation of the Voice Assistant Receptionist API. This API manages voice calls, transcripts, voicemails, and integrates with Vapi AI for dynamic voice assistance.

## Features

- **Call Management**: Create, retrieve, and manage voice assistant calls
- **Transcript Storage**: Store and retrieve conversation transcripts
- **Voicemail Handling**: Manage voicemail messages with audio URLs and transcripts
- **Dynamic Configuration**: Update agent behavior, FAQs, and system prompts without redeploying
- **Vapi Integration**: Webhook support for call reports and dynamic assistant configuration
- **Client Management**: Track caller information and call history
- **Database**: PostgreSQL with TypeORM for type-safe database operations

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Validation**: Joi
- **HTTP Client**: Axios
- **API Format**: REST with JSON

## Project Structure

```
src/voice-assistant-node-api/
├── src/
│   ├── config/           # Configuration management
│   │   └── config.ts     # Environment variables and settings
│   ├── database/         # Database setup and connection
│   │   └── database.ts   # TypeORM DataSource initialization
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts  # Error handling and async wrapper
│   │   └── validation.ts    # Request validation middleware
│   ├── models/           # TypeORM entity models
│   │   ├── Client.ts
│   │   ├── Call.ts
│   │   ├── Transcript.ts
│   │   ├── Voicemail.ts
│   │   └── ReceptionistSetting.ts
│   ├── routes/           # API endpoint handlers
│   │   ├── calls.ts      # Call management endpoints
│   │   ├── settings.ts   # Settings endpoints
│   │   └── vapi.ts       # Vapi webhook and integration endpoints
│   ├── schemas/          # Validation schemas
│   │   └── validation.ts # Joi schemas for request validation
│   ├── services/         # Business logic services
│   │   └── defaultSettings.ts # Default configuration values
│   ├── utils/            # Utility functions
│   │   ├── logger.ts     # Logging utility
│   │   └── errors.ts     # Custom error classes
│   └── index.ts          # Application entry point
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Installation

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Steps

1. **Clone/Navigate to the project**

   ```bash
   cd src/voice-assistant-node-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/voice_assistant

   # Vapi Configuration
   VAPI_API_KEY=your_vapi_api_key
   VAPI_SECRET_TOKEN=your_vapi_webhook_secret
   VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

   # Twilio Configuration (optional)
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Server
   HOST=0.0.0.0
   PORT=8000
   NODE_ENV=development
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The server will start at `http://localhost:8000`

## Available Scripts

- **`npm run dev`** - Start development server with file watching
- **`npm run build`** - Compile TypeScript to JavaScript
- **`npm start`** - Run compiled production build
- **`npm run lint`** - Run ESLint to check code quality
- **`npm run format`** - Format code with Prettier
- **`npm run typecheck`** - Check for TypeScript errors without building

## API Endpoints

### Health Check

```
GET /health
GET /
```

Returns server status and API information.

### Calls

```
GET    /api/calls                    # List calls (paginated)
GET    /api/calls/:id                # Get call details
POST   /api/calls                    # Create new call
PUT    /api/calls/:id                # Update call
POST   /api/calls/:id/transcripts    # Add transcript line
POST   /api/calls/:id/voicemails     # Add voicemail
```

### Settings

```
GET    /api/settings/public/config   # Get public configuration
GET    /api/settings/:key            # Get setting by key
POST   /api/settings                 # Create/update setting
```

### Vapi Integration

```
POST   /api/vapi/webhook             # Vapi webhook (end-of-call reports)
POST   /api/vapi/outbound            # Trigger outbound call
```

## Database Schema

### Clients Table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| phoneNumber | VARCHAR(20) | Unique phone number |
| name | VARCHAR(100) | Client name (nullable) |
| email | VARCHAR(255) | Client email (nullable) |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

### Calls Table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| clientId | UUID | Foreign key to clients |
| startTime | TIMESTAMP | Call start time |
| endTime | TIMESTAMP | Call end time (nullable) |
| durationSeconds | INTEGER | Call duration |
| status | VARCHAR(50) | Call status (ongoing, answered, needs-reply, failed) |
| recordingUrl | VARCHAR(512) | URL to recording file |
| summary | TEXT | AI-generated call summary |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

### Transcripts Table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| callId | UUID | Foreign key to calls |
| speaker | VARCHAR(50) | Who spoke (agent, caller identifier) |
| text | TEXT | What was said |
| timestamp | TIMESTAMP | When it was said |

### Voicemails Table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| callId | UUID | Foreign key to calls |
| audioUrl | VARCHAR(512) | URL to voicemail audio |
| transcript | TEXT | Transcribed voicemail text |
| isRead | BOOLEAN | Whether voicemail has been reviewed |
| createdAt | TIMESTAMP | When voicemail was created |

### ReceptionistSettings Table

| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR(100) | Primary key (setting identifier) |
| value | JSONB | Setting value (flexible JSON) |
| updatedAt | TIMESTAMP | Last update time |

## Error Handling

The API uses custom error classes for consistent error responses:

- **ValidationError** (400): Invalid request data
- **UnauthorizedError** (401): Missing or invalid authentication
- **ForbiddenError** (403): Authenticated user lacks permission
- **NotFoundError** (404): Requested resource not found
- **ConflictError** (409): Request conflicts with existing data
- **ExternalServiceError** (502): External API failure

All errors return a consistent JSON response:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": "Additional details (development mode only)"
  }
}
```

## Middleware

### Error Handler

Centralized error handling for all routes. Must be registered last.

```typescript
app.use(errorHandler);
```

### Async Handler

Wraps async route handlers to catch Promise rejections:

```typescript
router.get('/', asyncHandler(async (req, res) => {
  const data = await someAsyncOperation();
  res.json(data);
}));
```

### Validation Middleware

Validates request data against Joi schemas:

```typescript
router.post(
  '/clients',
  validateBody(clientSchema.create),
  createClient
);
```

## Configuration

### Environment Variables

All configuration is managed through environment variables:

- **DATABASE_URL**: PostgreSQL connection string
- **VAPI_API_KEY**: Vapi service API key
- **VAPI_SECRET_TOKEN**: Secret for webhook verification
- **VAPI_PHONE_NUMBER_ID**: Vapi phone number for outbound calls
- **TWILIO_ACCOUNT_SID**: Twilio account ID (optional)
- **TWILIO_AUTH_TOKEN**: Twilio authentication token (optional)
- **TWILIO_PHONE_NUMBER**: Inbound phone number (optional)
- **HOST**: Server host (default: 0.0.0.0)
- **PORT**: Server port (default: 8000)
- **NODE_ENV**: Environment (development, production)

### Default Settings

Default agent configuration and FAQs are stored in `src/services/defaultSettings.ts`:

- Agent model selection
- Voice configuration
- System prompts
- FAQ rules

These are used when settings haven't been saved to the database.

## Vapi Integration

### Webhook Events

The API accepts two types of Vapi webhooks:

1. **assistant-request**: Vapi requests dynamic configuration
   - Returns current agent config and FAQs
   - Allows runtime configuration changes

2. **end-of-call-report**: Vapi reports call completion
   - Stores call data, transcripts, and metadata
   - Creates client record if new
   - Intelligently marks calls for follow-up

### Outbound Calls

Trigger outbound calls using the Vapi API:

```bash
POST /api/vapi/outbound
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

Response:

```json
{
  "status": "success",
  "vapiCallId": "call_12345"
}
```

## Development

### Type Safety

The project uses TypeScript with strict type checking:

```bash
npm run typecheck
```

### Linting

Check code quality with ESLint:

```bash
npm run lint
```

### Code Formatting

Format code with Prettier:

```bash
npm run format
```

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Production Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Set production environment variables** in `.env`

3. **Start the server**:
   ```bash
   npm start
   ```

### Docker Support

Create a `Dockerfile` for containerization:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 8000
CMD ["node", "dist/index.js"]
```

## Logging

The application uses a simple logger utility in `src/utils/logger.ts`:

```typescript
import { logger } from './utils/logger';

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', errorDetails);
logger.debug('Debug message'); // Only in DEBUG mode
```

For production, consider integrating Winston, Pino, or similar.

## Testing

The project structure supports adding tests. Create test files with `.test.ts` or `.spec.ts` extensions:

```bash
# Example with Jest
npm install --save-dev jest @types/jest ts-jest
```

## Troubleshooting

### Database Connection Failed

- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure PostgreSQL user has sufficient permissions

### Vapi Webhook Not Working

- Verify VAPI_SECRET_TOKEN is configured
- Check webhook URL is publicly accessible
- Ensure `x-vapi-secret` header matches configured token

### Type Errors

- Run `npm run typecheck` to find TypeScript errors
- Ensure all imports are correct

## License

MIT

## Contributing

1. Follow the existing code structure and style
2. Add comments to complex logic
3. Ensure TypeScript strict mode compliance
4. Run linting and formatting before committing

## Related Projects

- **Python Version**: `src/voice-assistant-api` (Original FastAPI implementation)
- **Frontend**: `src/voice-assistant-webapp` (Next.js React application)
- **Database**: `src/voice-assistant-database` (PostgreSQL schema)
