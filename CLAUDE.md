# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates the code, and a live preview shows the result immediately. The application supports both anonymous and authenticated users, with project persistence via Prisma/SQLite.

## Common Commands

```bash
npm run dev                 # Start development server with Turbopack (port 3000)
npm run build              # Create production build
npm run start              # Run production server
npm run lint               # Run ESLint
npm run test               # Run Vitest tests (watch mode by default)
npm run test -- --ui       # Run tests with Vitest UI
npm run setup              # Initial setup: install deps + generate Prisma + migrate DB
npm run db:reset           # Reset SQLite database and re-run migrations
```

To run a single test file:
```bash
npm run test src/components/chat/__tests__/ChatInterface.test.tsx
```

To run tests once without watch mode:
```bash
npm run test -- --run
```

## Architecture

### Core Layers

**Pages & Routes** (`src/app/`)
- `/` - Unauthenticated landing/entry point; redirects authenticated users to their latest project
- `/[projectId]` - Project editor (chat + editor + preview)
- `/api/chat` - Streaming endpoint for AI-powered component generation using Claude

**Components** (`src/components/`)
- `chat/` - Chat interface (message list, message input, markdown renderer)
- `editor/` - Code editor and file tree navigation
- `preview/` - Live preview frame for rendered components
- `auth/` - Sign-in/sign-up forms and auth dialog
- `ui/` - Radix UI-based primitives (button, dialog, tabs, etc.)

**Core Library** (`src/lib/`)
- `file-system.ts` - Virtual file system (in-memory tree structure, no disk writes)
- `auth.ts` - Session management (JWT via `jose`)
- `prisma.ts` - Prisma client instance
- `provider.ts` - Language model factory (Claude via `@ai-sdk/anthropic`, or mock provider if no API key)
- `contexts/` - React Context providers for state management
  - `FileSystemContext` - Manages virtual file tree and file operations
  - `ChatContext` - Manages chat messages and streaming state
- `tools/` - Claude tool definitions that allow the model to modify files
  - `file-manager.ts` - Create/delete/read files and directories
  - `str-replace.ts` - String replacement in files (edit tool)
- `transform/` - JSX transformation utilities for safe execution in preview
- `prompts/` - System prompts for Claude (generation prompt guides component creation)
- `anon-work-tracker.ts` - Session-based tracking for anonymous users

**Server Actions** (`src/actions/`)
- `create-project.ts` - Create new project in DB
- `get-project.ts` - Fetch project with messages and file data
- `get-projects.ts` - List user's projects

### Data Flow

1. **User Input** → Chat interface collects user prompt
2. **API Call** → POST to `/api/chat` with messages and current virtual file system
3. **Claude Processes** → Streams response, can invoke `str_replace_editor` or `file_manager` tools
4. **Files Updated** → Virtual file system updated via tool calls
5. **Preview Renders** → Changes reflected in live preview frame
6. **Persist** → On completion, authenticated users' projects saved to Prisma/SQLite

### Virtual File System

The `VirtualFileSystem` class maintains an in-memory tree of files and directories. No files are written to disk. The system:
- Serializes/deserializes to JSON for DB storage
- Provides file operations (create, read, update, delete, list)
- Tracks file paths and directory hierarchies
- Is passed between client and server as part of chat messages

### AI Integration

- **Model**: Claude (via `@ai-sdk/anthropic`)
- **Streaming**: Vercel AI SDK's `streamText()` for streaming responses
- **Tools**: Claude can call `str_replace_editor` and `file_manager` to modify files
- **Caching**: Uses Anthropic prompt caching on system message for cost/latency
- **Fallback**: If no `ANTHROPIC_API_KEY`, a mock provider returns static code
- **Max Steps**: Limited to 4 steps for mock provider, 40 for real Claude (prevents infinite loops)

### Authentication & Persistence

- **Session**: JWT-based via `jose`; stored in cookies
- **Users**: Email + bcrypt-hashed password in SQLite
- **Projects**: Owned by user (optional `userId`); stores serialized messages and file system state
- **Anonymous**: No auth required; work is session-only (uses `anon-work-tracker.ts`)

### Testing

- **Framework**: Vitest with jsdom environment
- **Location**: `__tests__` folders alongside source files
- **Coverage**: Chat components, file system, transformers, contexts

## Key Technical Decisions

- **Virtual File System**: Keeps all work in-memory to avoid disk I/O; enables fast iteration without file system overhead
- **Context API for State**: Simpler than Redux for this scope; file system and chat state are global
- **Streaming Responses**: Provides real-time feedback as Claude generates code
- **Tool-Based Generation**: Claude modifies files directly via tools, not simple text generation
- **SQLite + Prisma**: Lightweight persistence suitable for development; SQLite stored in `prisma/dev.db`
- **Next.js App Router**: Modern routing with server/client boundary management
- **Babel Standalone**: Enables client-side JSX transpilation for safe preview execution

## Important Notes

- The virtual file system serializes to/from JSON for storage; ensure file content doesn't exceed reasonable JSON limits
- Tests run in jsdom; no Node.js globals available
- The development server requires `NODE_OPTIONS='--require ./node-compat.cjs'` for compatibility
- Database migrations are in `prisma/migrations/`; add new migrations with `npx prisma migrate dev`
- Environment variable `ANTHROPIC_API_KEY` is optional; omit it for static demo mode
