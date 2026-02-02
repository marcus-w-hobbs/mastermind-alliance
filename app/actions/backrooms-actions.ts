"use server";

import { streamText } from "ai";
import { ModelId, getModelInstance } from "@/lib/models";
import { PersonaFactory, Persona } from "@/lib/personas";
import { NextRequest } from "next/server";
import { generateMastermindMessageId } from "@/types/mastermind-message";

/**
 * Represents a message in the backrooms conversation,
 * which can come from AGENT 1 or AGENT 2.
 */
export interface BackroomsMessage {
  id: string;
  role: "assistant"; // TODO: Remove this
  content: string;
  agent: "AGENT 1" | "AGENT 2";
  timestamp: number;
  isStreaming?: boolean;
}

/**
 * Session data for a backrooms conversation
 */
interface BackroomsSessionData {
  sessionId: string;
  topic: string;
  modelName: ModelId;
  agent1: Persona;
  agent2: Persona;
  messages: BackroomsMessage[]; // The conversation so far
  turnCount: number;            // Number of (agent2 -> agent1) cycles that have completed
  timestamp: number;
}

// In-memory store of backrooms sessions
const backroomsSessions = new Map<string, BackroomsSessionData>();

// Clean up stale sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of backroomsSessions.entries()) {
    if (now - session.timestamp > 3600000) {
      backroomsSessions.delete(id);
    }
  }
}, 3600000);

/**
 * Create or get existing session with the provided sessionId
 */
function getOrCreateBackroomsSession(
  sessionId: string | null,
  topic: string,
  modelName: ModelId
): { session: BackroomsSessionData; sessionId: string } {
  if (sessionId && backroomsSessions.has(sessionId)) {
    const session = backroomsSessions.get(sessionId)!;
    session.timestamp = Date.now();
    // Possibly update topic and model if changed
    session.topic = topic;
    session.modelName = modelName;
    return { session, sessionId };
  }

  const newSessionId = sessionId || generateMastermindMessageId();
  const agent1 = PersonaFactory.createBackroomsAgent1(topic);
  const agent2 = PersonaFactory.createBackroomsAgent2(topic);

  const newSession: BackroomsSessionData = {
    sessionId: newSessionId,
    topic,
    modelName,
    agent1,
    agent2,
    messages: [],
    turnCount: 0,
    timestamp: Date.now(),
  };

  backroomsSessions.set(newSessionId, newSession);
  return { session: newSession, sessionId: newSessionId };
}

/**
 * Handles a POST request that starts or updates the conversation topic/model.
 */
export async function backroomsSSEPOST(req: NextRequest): Promise<Response> {
  try {
    const { sessionId, topic, modelName } = await req.json();

    if (!topic) {
      return new Response("Missing topic", { status: 400 });
    }
    if (!modelName) {
      return new Response("Missing modelName", { status: 400 });
    }
    
    const { sessionId: validSessionId } = getOrCreateBackroomsSession(
      sessionId,
      topic,
      modelName
    );

    return new Response(
      JSON.stringify({
        sessionId: validSessionId,
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    return new Response(
      `backroomsSSEPOST error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { status: 500 }
    );
  }
}

/**
 * Handles a GET SSE request that runs up to 'turnCount' more turns of the conversation
 * (default 5). This means AGENT2 => AGENT1 => AGENT2 => AGENT1 ... repeating for 'turnCount' cycles.
 */
export async function backroomsSSEGET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 });
    }

    const session = backroomsSessions.get(sessionId);
    if (!session) {
      return new Response("Invalid or expired session", { status: 404 });
    }

    // Number of (agent2->agent1) pairs to run
    const incrementsParam = url.searchParams.get("increments");
    const increments = incrementsParam ? parseInt(incrementsParam, 10) : 5;

    // Prepare SSE streaming
    const encoder = new TextEncoder();
    const transformStream = new TransformStream();
    const writable = transformStream.writable;
    const writer = writable.getWriter();

    async function sendSSE(dataObj: Record<string, unknown>, eventType: string = "message") {
      const payload = [
        `event: ${eventType}`,
        `data: ${JSON.stringify(dataObj)}`,
        "",
        ""
      ].join("\n");
      await writer.write(encoder.encode(payload));
    }

    // Retrieve model
    const model = getModelInstance(session.modelName);

    // We'll run agent2 => agent1 for 'increments' cycles
    (async () => {
      try {
        for (let i = 0; i < increments; i++) {
          // AGENT 2's turn
          const agent2MsgId = generateMastermindMessageId();
          let agent2ResponseText = "";
          await sendSSE({
            agent: "AGENT 2",
            chunk: "",
            done: false,
            type: "start",
            messageId: agent2MsgId
          });

          const { textStream: agent2TextStream } = streamText({
            model,
            messages: session.agent2.messages,
          });

          for await (const chunk of agent2TextStream) {
            agent2ResponseText += chunk;
            await sendSSE({
              agent: "AGENT 2",
              chunk,
              done: false,
              messageId: agent2MsgId
            });
          }

          const agent2Message: BackroomsMessage = {
            id: agent2MsgId,
            role: "assistant",
            content: agent2ResponseText,
            agent: "AGENT 2",
            timestamp: Date.now(),
          };

          session.messages.push(agent2Message);
          session.agent2.addAssistantMessage(agent2ResponseText);
          session.agent1.addUserMessage(agent2ResponseText);

          await sendSSE({
            agent: "AGENT 2",
            chunk: "",
            done: true,
            messageId: agent2MsgId,
            timestamp: agent2Message.timestamp
          });

          // AGENT 1's turn
          const agent1MsgId = generateMastermindMessageId();
          let agent1ResponseText = "";
          await sendSSE({
            agent: "AGENT 1",
            chunk: "",
            done: false,
            type: "start",
            messageId: agent1MsgId
          });

          const { textStream: agent1TextStream } = streamText({
            model,
            messages: session.agent1.messages,
          });

          for await (const chunk of agent1TextStream) {
            agent1ResponseText += chunk;
            await sendSSE({
              agent: "AGENT 1",
              chunk,
              done: false,
              messageId: agent1MsgId
            });
          }

          const agent1Message: BackroomsMessage = {
            id: agent1MsgId,
            role: "assistant",
            content: agent1ResponseText,
            agent: "AGENT 1",
            timestamp: Date.now(),
          };

          session.messages.push(agent1Message);
          session.agent1.addAssistantMessage(agent1ResponseText);
          session.agent2.addUserMessage(agent1ResponseText);

          await sendSSE({
            agent: "AGENT 1",
            chunk: "",
            done: true,
            messageId: agent1MsgId,
            timestamp: agent1Message.timestamp
          });
        }

        session.turnCount += increments;
        await sendSSE({ completed: true }, "complete");
      } catch (err) {
        await sendSSE(
          {
            error: true,
            message: err instanceof Error ? err.message : String(err),
          },
          "error"
        );
      } finally {
        writer.close();
      }
    })();

    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    return new Response(
      `backroomsSSEGET error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { status: 500 }
    );
  }
}