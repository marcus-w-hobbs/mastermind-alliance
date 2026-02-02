# Mastermind Engine Adapters

This directory contains adapters that enable the Mastermind Engine to run in different environments. Adapters provide environment-specific interfaces while maintaining the same core conversation functionality.

## Available Adapters

### CLI Adapter (`cli-adapter.ts`)

The CLI Adapter provides a command-line interface for the Mastermind Engine, enabling interactive conversations in terminal environments.

#### Features

- 🎭 **Interactive Conversations**: Real-time persona selection and response generation
- 🌊 **Streaming Responses**: Character-by-character streaming for natural conversation flow
- 🎬 **Director Insights**: Display reasoning behind persona selection decisions
- 💾 **Session Management**: Optional persistent session storage to disk
- 🧠 **Memory Integration**: File-based memory for conversation context
- 🎨 **Colored Output**: Rich terminal formatting for better readability
- ⚡ **Error Handling**: Graceful error recovery and user-friendly messages

#### Quick Start

```typescript
import { startCLIMastermind } from './adapters';

const config = {
  modelId: 'claude-3-5-haiku-20241022',
  selectedPersonas: ['socrates', 'friedrich-nietzsche', 'alan-watts'],
  maxResponses: 10,
  enableMemory: false
};

// Start interactive CLI session
await startCLIMastermind(config);
```

#### Advanced Usage

```typescript
import { createCLIAdapter, createCLISessionManager, createCLIMemoryManager } from './adapters';

// Create managers with custom configuration
const sessionManager = createCLISessionManager({
  enablePersistence: true,
  sessionDirectory: './my-sessions',
  verbose: true
});

const memoryManager = createCLIMemoryManager({
  memoryDirectory: './my-memory',
  verbose: true
});

// Create adapter with custom settings
const adapter = createCLIAdapter({
  enableColors: true,
  showDirectorInsights: true,
  showMetadata: true,
  verbose: true,
  enableMemory: true,
  userPrompt: '🎭 mastermind> '
}, sessionManager, memoryManager);

// Initialize and start
await adapter.initialize(config);
await adapter.startInteractiveSession();
```

#### Demo Scripts

Several demo scripts are provided to showcase different usage patterns:

1. **Interactive Demo** (`cli-demo.ts`)
   ```bash
   npx tsx lib/mastermind-engine/adapters/cli-demo.ts
   ```
   - Interactive setup wizard
   - Persona preset selection
   - Configuration options

2. **Quick Start Demo**
   ```bash
   npx tsx lib/mastermind-engine/adapters/cli-demo.ts --quick
   ```
   - Uses default configuration
   - Immediate conversation start

3. **Examples** (`example-usage.ts`)
   ```bash
   npx tsx lib/mastermind-engine/adapters/example-usage.ts --quick
   npx tsx lib/mastermind-engine/adapters/example-usage.ts --streaming
   npx tsx lib/mastermind-engine/adapters/example-usage.ts --persistent
   ```

4. **Tests** (`test-cli.ts`)
   ```bash
   npx tsx lib/mastermind-engine/adapters/test-cli.ts
   npx tsx lib/mastermind-engine/adapters/test-cli.ts --interactive
   ```

### CLI Session Manager (`cli-session-manager.ts`)

Enhanced session management for CLI environments with optional persistence.

#### Features

- 💾 **File-based Persistence**: Save sessions to disk for recovery
- 🔍 **Rich Metadata**: CLI-specific session information (terminal size, process info, etc.)
- 🧹 **Automatic Cleanup**: Configurable session expiration and cleanup
- 📊 **Session Statistics**: Detailed session analytics and debugging info

#### Configuration

```typescript
const sessionManager = createCLISessionManager({
  enablePersistence: true,           // Save sessions to disk
  sessionDirectory: './sessions',    // Where to store session files
  timeoutMs: 3600000,               // Session timeout (1 hour)
  cleanupIntervalMs: 300000,        // Cleanup frequency (5 minutes)
  maxInMemorySessions: 10,          // Memory limit
  verbose: true,                    // Enable logging
  autoSave: true                    // Auto-save after updates
});
```

### CLI Memory Manager (`cli-memory-manager.ts`)

Simple file-based memory storage for conversation context.

#### Features

- 📁 **Local Storage**: No external dependencies, uses local files
- 🔍 **Text Search**: Simple keyword-based memory retrieval
- 🧹 **Automatic Cleanup**: Configurable memory retention policies
- 📈 **Memory Analytics**: Usage statistics and memory health metrics

#### Configuration

```typescript
const memoryManager = createCLIMemoryManager({
  memoryDirectory: './memory',       // Where to store memory files
  verbose: true,                    // Enable logging
  maxMemoriesPerUser: 1000,         // Memory limit per user
  maxMemoryLength: 2000,            // Max characters per memory
  enableAutoCleanup: true,          // Auto-cleanup old memories
  cleanupThresholdMs: 604800000,    // 7 days retention
  searchThreshold: 0.3              // Search relevance threshold
});
```

## CLI Commands

When running interactively, the CLI adapter supports these commands:

- **help**, **/?**, **?** - Show help information
- **quit**, **exit**, **q** - End the conversation
- **Ctrl+C** - Immediate exit

## Configuration Options

### CLI Adapter Config

```typescript
interface CLIAdapterConfig {
  enableColors: boolean;           // Use colored terminal output
  showDirectorInsights: boolean;   // Display director decision reasoning
  showMetadata: boolean;          // Show conversation statistics
  verbose: boolean;               // Enable detailed logging
  userPrompt: string;             // Custom input prompt
  enableMemory: boolean;          // Enable memory integration
  welcomeMessage?: string;        // Custom welcome message
  exitCommands: string[];         // Commands that exit the conversation
  helpCommands: string[];         // Commands that show help
}
```

### Conversation Config

```typescript
interface ConversationConfig {
  modelId: ModelId;                    // AI model to use
  selectedPersonas: PersonaId[];       // Personas participating
  maxResponses?: number;               // Max responses before ending
  directorModelId?: ModelId;           // Model for director decisions
  enableMemory?: boolean;              // Enable memory integration
  userMemoryId?: string;               // User ID for memory
  sessionConfig?: {
    sessionId?: string;                // Custom session ID
    timeout?: number;                  // Session timeout
  };
}
```

## Error Handling

The CLI adapter includes comprehensive error handling:

- **Connection Errors**: Graceful handling of API failures
- **Persona Failures**: Automatic fallback to other personas
- **Session Errors**: Recovery and cleanup procedures
- **User Input Errors**: Validation and helpful error messages

## Performance Considerations

- **Streaming**: Uses small chunk sizes (1 character) for responsive CLI output
- **Memory Management**: Configurable limits to prevent excessive memory usage
- **Session Cleanup**: Automatic cleanup of expired sessions
- **File I/O**: Efficient file operations for persistence and memory

## Debugging

Enable verbose mode for detailed logging:

```typescript
const adapter = createCLIAdapter({
  verbose: true,
  showMetadata: true
});
```

This will show:
- Session creation and management
- Director decision reasoning
- Response generation attempts
- Memory operations
- Error details and stack traces

## Examples Directory Structure

```
adapters/
├── cli-adapter.ts           # Main CLI adapter implementation
├── cli-session-manager.ts   # Session management with persistence
├── cli-memory-manager.ts    # File-based memory management
├── cli-demo.ts             # Interactive demo script
├── example-usage.ts        # Usage examples
├── test-cli.ts            # Test suite
├── index.ts               # Exports and types
└── README.md              # This documentation
```

## Contributing

When adding new adapters:

1. Implement the `ConversationAdapter` interface
2. Create supporting managers if needed (session, memory)
3. Add comprehensive examples and tests
4. Update the main index.ts exports
5. Document configuration options and usage patterns

## Testing

Run the test suite to verify functionality:

```bash
# Basic functionality tests
npx tsx lib/mastermind-engine/adapters/test-cli.ts

# Include interactive tests
npx tsx lib/mastermind-engine/adapters/test-cli.ts --interactive
```

## Troubleshooting

### Common Issues

1. **"Persona not found" errors**
   - Check that persona IDs exist in the personas registry
   - Verify the PersonaFactory can load the personas

2. **Session persistence failures**
   - Ensure the session directory exists and is writable
   - Check file permissions and disk space

3. **Memory operations failing**
   - Verify memory directory permissions
   - Check available disk space for memory files

4. **API connection errors**
   - Verify API keys are configured in environment variables
   - Check network connectivity and API service status

### Debug Mode

Enable debug mode for detailed troubleshooting:

```bash
DEBUG=1 npx tsx lib/mastermind-engine/adapters/cli-demo.ts --verbose
```