import { CoreMessage } from "ai";

/**
 * Interface defining the public API for Persona objects
 */
export interface Persona {
    /** Get the persona's name */
    readonly name: string;
    
    /** Get the current messages array */
    readonly messages: CoreMessage[];
    
    /** Reset messages to their original state (i.e., only the system prompt) */
    resetMessages(): void;
    
    /** Add to original system prompt.  This is idempotent. */
    addToSystemPrompt(prompt: string): void;

    /** Add a user message to the conversation */
    addUserMessage(message: string): void;
    
    /** Add an assistant message to the conversation */
    addAssistantMessage(message: string): void;

    /** Replace a string in the messages */
    replaceInMessages(search: string, replace: string): void;

    /** Get the system prompt */
    getSystemPrompt(): string;
}

/**
 * Implementation of the Persona interface
 */
export class PersonaImpl implements Persona {
    private _name: string;
    private _originalMessages: CoreMessage[];
    private _messages: CoreMessage[];

    /**
     * Static method to create a basic persona with a system message
     */
    static createBasic(name: string, systemPrompt?: string): Persona {
        const messages: CoreMessage[] = [{
            role: "system",
            content: systemPrompt || "You are a helpful assistant."
        }];
        
        return new PersonaImpl(name, messages);
    }

    constructor(
        name: string = "assistant", 
        messages: CoreMessage[] = [{
            role: "system",
            content: "You are a helpful assistant."
        }]
    ) {
        this._name = name;
        this._originalMessages = [...messages];
        this._messages = [...messages];
        
        // Validate that there is exactly one system message
        const systemMessages = messages.filter(msg => msg.role === "system");
        if (systemMessages.length !== 1) {
            console.error(`${name}: Personas require one and only one system prompt.`);
        }
    }

    get name(): string {
        return this._name;
    }

    get messages(): CoreMessage[] {
        return this._messages;
    }

    resetMessages(): void {
        this._messages = [...this._originalMessages];
    }
    
    /**
     * Add a string to the system prompt.
     */
    addToSystemPrompt(prompt: string): void {
        const originalSystemMessage = this._originalMessages.filter(msg => msg.role === "system");
        const currentSystemMessage = this._messages.filter(msg => msg.role === "system");

        if (originalSystemMessage.length !== 1 || currentSystemMessage.length !== 1) {
            throw new Error(`${this._name}: Personas require exactly one system prompt`);
        }

        const originalSystemPrompt = originalSystemMessage[0].content;
        currentSystemMessage[0].content = originalSystemPrompt + ". \n" + prompt;
    }

    getSystemPrompt(): string {
        return this._messages.find(msg => msg.role === "system")?.content || "";
    }

    addUserMessage(message: string): void {
        this._messages.push({
            role: "user",
            content: message
        });
    }

    addAssistantMessage(message: string): void {
        this._messages.push({
            role: "assistant",
            content: message
        });
    }

    replaceInMessages(search: string, replace: string): void {
        this._messages = this._messages.map(message => {
          if (typeof message.content === 'string') {
            return {
              ...message,
              content: message.content.replace(new RegExp(search, 'g'), replace)
            } as CoreMessage;
          }
          return message;
        });
    }
} 