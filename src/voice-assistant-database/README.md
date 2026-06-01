# Voice Assistant Database Setup

This directory contains the database structure, schema tables, PL/pgSQL functions, triggers, and configurations for the receptionist voice assistant.

## Features
- **Host / Port**: `localhost:5434`
- **User**: `postgres` (passwordless, local-only trust connection)
- **Database Name**: `voice_assistant`

## Running the Database locally (Docker)

To start the database in a Docker container:
```bash
docker compose up -d
```

To stop the database:
```bash
docker compose down
```

## Initializing Schemas, Functions, and Triggers

If running locally and you have the `psql` client installed, run the following commands sequentially to build the DB structures:

1. **Tables**:
   ```bash
   psql -h localhost -p 5434 -U postgres -d voice_assistant -f schema/tables.sql
   ```

2. **Functions**:
   ```bash
   psql -h localhost -p 5434 -U postgres -d voice_assistant -f functions/functions.sql
   ```

3. **Triggers**:
   ```bash
   psql -h localhost -p 5434 -U postgres -d voice_assistant -f triggers/triggers.sql
   ```
