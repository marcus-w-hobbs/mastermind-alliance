// models.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";

// Define model IDs as discriminated union
type MODEL_IDS = {
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5-chat-latest": "gpt-5-chat-latest",
  "gpt-4.5-preview": "gpt-4.5-preview",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o-mini-edmond-otis": "gpt-4o-mini-edmond-otis",
  "o3-mini": "o3-mini",
  "o3": "o3",
  "o3-5": "o3-5",
  "o4-mini": "o4-mini",
  "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620": "claude-3-5-sonnet-20240620",
  "claude-3-7-sonnet-20250219": "claude-3-7-sonnet-20250219",
  "claude-opus-4-20250514": "claude-opus-4-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "claude-opus-4-1-20250805": "claude-opus-4-1-20250805",
  "claude-sonnet-4-1-20250805": "claude-sonnet-4-1-20250805",
  "claude-sonnet-4-5-20250929": "claude-sonnet-4-5-20250929",
  "claude-haiku-4-20250514": "claude-haiku-4-20250514",
  "claude-4.1-opus": "claude-4.1-opus",
  "claude-4.1-sonnet": "claude-4.1-sonnet",
  "claude-4.5-sonnet": "claude-4.5-sonnet",
  "microsoft/wizardlm-2-8x22b": "microsoft/wizardlm-2-8x22b",
  "x-ai/grok-3-beta": "x-ai/grok-3-beta",
  "sao10k/fimbulvetr-11b-v2": "sao10k/fimbulvetr-11b-v2",
  "infermatic/mn-inferor-12b": "infermatic/mn-inferor-12b",
  "aetherwiing/mn-starcannon-12b": "aetherwiing/mn-starcannon-12b",
  "thedrummer/unslopnemo-12b": "thedrummer/unslopnemo-12b",
  "neversleep/llama-3-lumimaid-70b": "neversleep/llama-3-lumimaid-70b",
  "neversleep/llama-3-lumimaid-8b:extended": "neversleep/llama-3-lumimaid-8b:extended",
  "neversleep/llama-3-lumimaid-8b": "neversleep/llama-3-lumimaid-8b",
  "cohere/command-r-plus": "cohere/command-r-plus",
  "sophosympatheia/midnight-rose-70b": "sophosympatheia/midnight-rose-70b",
  "mancer/weaver": "mancer/weaver",
  "gryphe/mythomax-l2-13b": "gryphe/mythomax-l2-13b",
  "llama-3.1-8b-lexi-uncensored-v2": "llama-3.1-8b-lexi-uncensored-v2",
  "llama-3.2-3b-instruct-unsloth-q4_k_m-iz-05.gguf": "llama-3.2-3b-instruct-unsloth-q4_k_m-iz-05.gguf",
  "meta-llama/llama-4-maverick": "meta-llama/llama-4-maverick",
  "deepseek/deepseek-v3-base:free": "deepseek/deepseek-v3-base:free",
  "deepseek/deepseek-chat-v3-0324:free": "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.1-405b:free": "meta-llama/llama-3.1-405b:free",
  "google/gemini-2.5-flash-preview-05-20": "google/gemini-2.5-flash-preview-05-20",
  "google/gemini-2.5-pro-preview": "google/gemini-2.5-pro-preview",
  "inflection/inflection-3-pi": "inflection/inflection-3-pi",
  "qwen/qwen-max": "qwen/qwen-max",
  "nothingiisreal/mn-celeste-12b": "nothingiisreal/mn-celeste-12b",
  "aion-labs/aion-rp-llama-3.1-8b": "aion-labs/aion-rp-llama-3.1-8b",
  "arliai/qwq-32b-arliai-rpr-v1:free": "arliai/qwq-32b-arliai-rpr-v1:free",
  };

export type ModelId = MODEL_IDS[keyof MODEL_IDS];

export const DEFAULT_MODEL_ID: ModelId = "claude-3-5-sonnet-20240620";

// Define metadata interface
export interface ModelMetadata {
  id: ModelId;
  name: string;
  description: string;
  category: "OpenAI" | "Anthropic" | "Local" | "OpenRouter";
  provider: "openai" | "anthropic" | "lmstudio" | "openrouter";
  instance: LanguageModel;
  maxTokens?: number;
}

// Helper to cast LanguageModelV3 to LanguageModel (V2) for type compatibility
// AI SDK v5 providers return V3 but types expect V2 - this is a known issue
const asLanguageModel = <T>(model: T): LanguageModel => model as unknown as LanguageModel;

// For local models, we assume LMStudio is running
const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://localhost:1234/v1",
});

// OpenRouter provider
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
    'X-Title': 'Mastermind Alliance'
  }
});

// Create registry of all models
export const modelsRegistry: Record<ModelId, ModelMetadata> = {
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5 (Reasoning, ⚠️ Slow)",
    description: "GPT-5 is OpenAI's advanced reasoning model. WARNING: This model has very long response times (20-50+ seconds with default settings) and may timeout on Vercel. Use 'reasoningEffort: low' for faster responses. Consider GPT-5-chat-latest for real-time conversations.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-5"),
    maxTokens: 4096,
    // WARNING: GPT-5 is a reasoning model with 20-50+ second response times
    // Use providerOptions.openai.reasoningEffort: "low" for faster responses
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 Mini (Reasoning)",
    description: "GPT-5 Mini is a smaller, faster reasoning model. Balances reasoning capabilities with improved response times (10-20 seconds). Good for complex tasks that need some reasoning but also reasonable speed.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-5-mini"),
    maxTokens: 4096,
  },
  "gpt-5-nano": {
    id: "gpt-5-nano",
    name: "GPT-5 Nano (Fast Reasoning)",
    description: "GPT-5 Nano is the fastest GPT-5 variant with light reasoning capabilities. Response times of 5-10 seconds make it suitable for real-time conversations that benefit from reasoning.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-5-nano"),
    maxTokens: 4096,
  },
  "gpt-5-chat-latest": {
    id: "gpt-5-chat-latest",
    name: "GPT-5 Chat (Non-reasoning)",
    description: "GPT-5 Chat is the non-reasoning, chat-tuned variant of GPT-5. Optimized for conversational responses with fast response times (2-5 seconds). Best for real-time chat without heavy reasoning needs.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-5-chat-latest"),
    maxTokens: 4096,
  },
  "o3-mini": {
    id: "o3-mini",
    name: "o3 Mini",
    description: "OpenAI o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly excelling in science, mathematics, and coding. This model supports the reasoning_effort parameter, which can be set to 'high', 'medium', or 'low' to control the thinking time of the model. The default is 'medium'. OpenRouter also offers the model slug openai/o3-mini-high to default the parameter to 'high'. The model features three adjustable reasoning effort levels and supports key developer capabilities including function calling, structured outputs, and streaming, though it does not include vision processing capabilities. The model demonstrates significant improvements over its predecessor, with expert testers preferring its responses 56% of the time and noting a 39% reduction in major errors on complex questions. With medium reasoning effort settings, o3-mini matches the performance of the larger o1 model on challenging reasoning evaluations like AIME and GPQA, while maintaining lower latency and cost.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("o3-mini")
  },
  "o3": {
    id: "o3",
    name: "o3",
    description: "o3 is a well-rounded and powerful model across domains. It sets a new standard for math, science, coding, and visual reasoning tasks. It also excels at technical writing and instruction-following. Use it to think through multi-step problems that involve analysis across text, code, and images. Note that BYOK is required for this model.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("o3")
  },
  "o3-5": {
    id: "o3-5",
    name: "o3.5",
    description: "OpenAI o3.5 is the latest evolution of OpenAI's reasoning-focused model family. It continues to push the boundaries of what's possible in advanced reasoning, coding, mathematics, and scientific problem-solving. The model supports configurable reasoning effort levels and is optimized for both capability and cost-efficiency. Use it for complex multi-step problems requiring deep analysis.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("o3.5")
  },
  "o4-mini": {
    id: "o4-mini",
    name: "o4 Mini",
    description: "OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient performance while retaining strong multimodal and agentic capabilities. It supports tool use and demonstrates competitive reasoning and coding performance across benchmarks like AIME (99.5% with Python) and SWE-bench, outperforming its predecessor o3-mini and even approaching o3 in some domains. Despite its smaller size, o4-mini exhibits high accuracy in STEM tasks, visual problem solving (e.g., MathVista, MMMU), and code editing. It is especially well-suited for high-throughput scenarios where latency or cost is critical. Thanks to its efficient architecture and refined reinforcement learning training, o4-mini can chain tools, generate structured outputs, and solve multi-step tasks with minimal delay—often in under a minute.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("o4-mini")
  },
  "gpt-4.5-preview": {
    id: "gpt-4.5-preview",
    name: "GPT-4.5 Preview",
    description: "GPT-4.5 (Preview) is a research preview of OpenAI’s latest language model, designed to advance capabilities in reasoning, creativity, and multi-turn conversation. It builds on previous iterations with improvements in world knowledge, contextual coherence, and the ability to follow user intent more effectively. The model demonstrates enhanced performance in tasks that require open-ended thinking, problem-solving, and communication. Early testing suggests it is better at generating nuanced responses, maintaining long-context coherence, and reducing hallucinations compared to earlier versions. This research preview is intended to help evaluate GPT-4.5’s strengths and limitations in real-world use cases as OpenAI continues to refine and develop future models.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-4.5-preview")
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "GPT-4.1 is a flagship large language model optimized for advanced instruction following, real-world software engineering, and long-context reasoning. It supports a 1 million token context window and outperforms GPT-4o and GPT-4.5 across coding (54.6% SWE-bench Verified), instruction compliance (87.4% IFEval), and multimodal understanding benchmarks. It is tuned for precise code diffs, agent reliability, and high recall in large document contexts, making it ideal for agents, IDE tooling, and enterprise knowledge retrieval.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-4.1")
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    description: "GPT-4.1 Mini is a mid-sized model delivering performance competitive with GPT-4o at substantially lower latency and cost. It retains a 1 million token context window and scores 45.1% on hard instruction evals, 35.8% on MultiChallenge, and 84.1% on IFEval. Mini also shows strong coding ability (e.g., 31.6% on Aider’s polyglot diff benchmark) and vision understanding, making it suitable for interactive applications with tight performance constraints.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-4.1-mini")
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    description: "For tasks that demand low latency, GPT‑4.1 nano is the fastest and cheapest model in the GPT-4.1 series. It delivers exceptional performance at a small size with its 1 million token context window, and scores 80.1% on MMLU, 50.3% on GPQA, and 9.8% on Aider polyglot coding – even higher than GPT‑4o mini. It’s ideal for tasks like classification or autocompletion.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-4.1-nano")
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "GPT-4o mini is OpenAI's newest model after GPT-4 Omni, supporting both text and image inputs with text outputs. As their most advanced small model, it is many multiples more affordable than other recent frontier models, and more than 60% cheaper than GPT-3.5 Turbo. It maintains SOTA intelligence, while being significantly more cost-effective. GPT-4o mini achieves an 82% score on MMLU and presently ranks higher than GPT-4 on chat preferences common leaderboards.",
    category: "OpenAI",
    provider: "openai",
    instance: openai("gpt-4o-mini")
  },
  "gpt-4o-mini-edmond-otis": {
    id: "gpt-4o-mini-edmond-otis",
    name: "GPT-4o Mini Edmond Otis",
    description: "Optimized version of GPT-4o for faster responses, fine tuned on Edmond Otis",
    category: "OpenAI",
    provider: "openai",
    instance: openai("ft:gpt-4o-mini-2024-07-18:perfect-buzz-music:iz:BJ9YNCfZ")
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "Claude 3.5 Haiku features offers enhanced capabilities in speed, coding accuracy, and tool use. Engineered to excel in real-time applications, it delivers quick response times that are essential for dynamic tasks such as chat interactions and immediate coding suggestions.  This makes it highly suitable for environments that demand both speed and precision, such as software development, customer service bots, and data management systems.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-3-5-haiku-20241022"),
    maxTokens: 100000
  },
  "claude-3-5-sonnet-20240620": {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude 3.5 Sonnet",
    description: "New Claude 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at: Coding: Scores ~49% on SWE-Bench Verified, higher than the last best score, and without any fancy prompt scaffolding. Data science: Augments human data science expertise; navigates unstructured data while using multiple tools for insights. Visual processing: excelling at interpreting charts, graphs, and images, accurately transcribing text to derive insights beyond just the text alone. Agentic tasks: exceptional tool use, making it great at agentic tasks (i.e. complex, multi-step problem solving tasks that require engaging with other systems).",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-3-5-sonnet-20240620"),
    maxTokens: 200000
  },
  "claude-3-7-sonnet-20250219": {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    description: "Claude 3.7 Sonnet is an advanced large language model with improved reasoning, coding, and problem-solving capabilities. It introduces a hybrid reasoning approach, allowing users to choose between rapid responses and extended, step-by-step processing for complex tasks. The model demonstrates notable improvements in coding, particularly in front-end development and full-stack updates, and excels in agentic workflows, where it can autonomously navigate multi-step processes.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-3-7-sonnet-20250219"),
    maxTokens: 200000
  },
  "claude-opus-4-20250514": {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "Claude Opus 4 is benchmarked as the world’s best coding model, at time of release, bringing sustained performance on complex, long-running tasks and agent workflows. It sets new benchmarks in software engineering, achieving leading results on SWE-bench (72.5%) and Terminal-bench (43.2%). Opus 4 supports extended, agentic workflows, handling thousands of task steps continuously for hours without degradation.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-opus-4-20250514")
  },
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Claude Sonnet 4 significantly enhances the capabilities of its predecessor, Sonnet 3.7, excelling in both coding and reasoning tasks with improved precision and controllability. Achieving state-of-the-art performance on SWE-bench (72.7%), Sonnet 4 balances capability and computational efficiency, making it suitable for a broad range of applications from routine coding tasks to complex software development projects. Key enhancements include improved autonomous codebase navigation, reduced error rates in agent-driven workflows, and increased reliability in following intricate instructions. Sonnet 4 is optimized for practical everyday use, providing advanced reasoning capabilities while maintaining efficiency and responsiveness in diverse internal and external scenarios.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-sonnet-4-20250514")
  },
  "claude-opus-4-1-20250805": {
    id: "claude-opus-4-1-20250805",
    name: "Claude Opus 4.1",
    description: "Claude Opus 4.1 is Anthropic's flagship model offering state-of-the-art intelligence and reasoning capabilities. It excels at complex multi-step reasoning, advanced coding tasks, scientific problem-solving, and long-context analysis. This version is optimized for the most demanding applications requiring maximum capability and extended thinking.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-opus-4-1-20250805"),
    maxTokens: 200000
  },
  "claude-sonnet-4-1-20250805": {
    id: "claude-sonnet-4-1-20250805",
    name: "Claude Sonnet 4.1",
    description: "Claude Sonnet 4.1 is a high-performing, balanced model from Anthropic. It maintains the speed and efficiency of the Sonnet line while delivering enhanced reasoning, coding, and problem-solving capabilities. It's an excellent choice for production applications requiring both capability and responsiveness.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-sonnet-4-1-20250805"),
    maxTokens: 200000
  },
  "claude-sonnet-4-5-20250929": {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    description: "Claude Sonnet 4.5 is the latest frontier Claude model from Anthropic, designed for superior performance across reasoning, coding, and complex problem-solving. It represents a significant leap forward in capability while maintaining the efficiency and responsiveness of the Sonnet line. Ideal for demanding applications requiring state-of-the-art intelligence.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-sonnet-4-5-20250929"),
    maxTokens: 200000
  },
  "claude-haiku-4-20250514": {
    id: "claude-haiku-4-20250514",
    name: "Claude Haiku 4",
    description: "Claude Haiku 4 is Anthropic's fastest and most compact model. It's optimized for speed and efficiency while maintaining strong performance on a wide variety of tasks. Ideal for real-time interactions, streaming responses, and cost-sensitive applications.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-haiku-4-20250514"),
    maxTokens: 100000
  },
  "claude-4.1-opus": {
    id: "claude-4.1-opus",
    name: "Claude Opus 4.1 (Alias)",
    description: "Alias for Claude Opus 4.1 (2025-08-05). Use this or the direct model ID interchangeably.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-opus-4-1-20250805")
  },
  "claude-4.1-sonnet": {
    id: "claude-4.1-sonnet",
    name: "Claude Sonnet 4.1 (Alias)",
    description: "Alias for Claude Sonnet 4.1 (2025-08-05). Use this or the direct model ID interchangeably.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-sonnet-4-1-20250805")
  },
  "claude-4.5-sonnet": {
    id: "claude-4.5-sonnet",
    name: "Claude Sonnet 4.5 (Alias)",
    description: "Alias for Claude Sonnet 4.5 (2025-09-29). Use this or the direct model ID interchangeably.",
    category: "Anthropic",
    provider: "anthropic",
    instance: anthropic("claude-sonnet-4-5-20250929")
  },
  "llama-3.1-8b-lexi-uncensored-v2": {
    id: "llama-3.1-8b-lexi-uncensored-v2",
    name: "Llama 3.1 8B Lexi",
    description: "Local Llama model running via LMStudio",
    category: "Local",
    provider: "lmstudio",
    instance: asLanguageModel(lmstudio("llama-3.1-8b-lexi-uncensored-v2"))
  },
  "llama-3.2-3b-instruct-unsloth-q4_k_m-iz-05.gguf": {
    id: "llama-3.2-3b-instruct-unsloth-q4_k_m-iz-05.gguf",
    name: "Llama 3.2 3B Instruct",
    description: "Local Llama model running via LMStudio, fine tuned on Edmond Otis",
    category: "Local",
    provider: "lmstudio",
    instance: asLanguageModel(lmstudio("llama-3.2-3b-instruct-unsloth-q4_k_m-iz-05.gguf"))
  },
  "microsoft/wizardlm-2-8x22b": {
    id: "microsoft/wizardlm-2-8x22b",
    name: "WizardLM-2 8x22B",
    description: "WizardLM-2 8x22B is Microsoft AI's most advanced Wizard model. It demonstrates highly competitive performance compared to leading proprietary models, and it consistently outperforms all existing state-of-the-art opensource models.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("microsoft/wizardlm-2-8x22b"))
  }, 
  "x-ai/grok-3-beta": {
    id: "x-ai/grok-3-beta",
    name: "xAI: Grok 3 Beta",
    description: "Grok 3 is the latest model from xAI. It's their flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, healthcare, law, and science.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("x-ai/grok-2-1212"))
  },
  "sao10k/fimbulvetr-11b-v2": {
    id: "sao10k/fimbulvetr-11b-v2",
    name: "Fimbulvetr 11B v2",
    description: "Creative writing model, routed with permission. It's fast, it keeps the conversation going, and it stays in character.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("sao10k/fimbulvetr-11b-v2"))
  },
  "infermatic/mn-inferor-12b": {
    id: "infermatic/mn-inferor-12b",
    name: "Infermatic: Mistral Nemo Inferor 12B",
    description: "Inferor 12B is a merge of top roleplay models, expert on immersive narratives and storytelling.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("infermatic/mn-inferor-12b"))
  },
  "aetherwiing/mn-starcannon-12b": {
    id: "aetherwiing/mn-starcannon-12b",
    name: "Aetherwiing: Starcannon 12B",
    description: "Starcannon 12B v2 is a creative roleplay and story writing model, based on Mistral Nemo",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("aetherwiing/mn-starcannon-12b"))
  },
  "thedrummer/unslopnemo-12b": {
    id: "thedrummer/unslopnemo-12b",
    name: "Unslopnemo 12B",
    description: "UnslopNemo v4.1 is the latest addition from the creator of Rocinante, designed for adventure writing and role-play scenarios.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("thedrummer/unslopnemo-12b"))
  },
  "neversleep/llama-3-lumimaid-70b": {
    id: "neversleep/llama-3-lumimaid-70b",
    name: "NeverSleep: Llama 3 Lumimaid 70B",
    description: "The NeverSleep team is back, with a Llama 3 70B finetune trained on their curated roleplay data. Striking a balance between eRP and RP, Lumimaid was designed to be serious, yet uncensored when necessary.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("neversleep/llama-3-lumimaid-70b"))
  },
  "neversleep/llama-3-lumimaid-8b:extended": {
    id: "neversleep/llama-3-lumimaid-8b:extended",
    name: "NeverSleep: Llama 3 Lumimaid 8B (extended)",
    description: "The NeverSleep team is back, with a Llama 3 8B finetune trained on their curated roleplay data. Striking a balance between eRP and RP, Lumimaid was designed to be serious, yet uncensored when necessary.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("neversleep/llama-3-lumimaid-8b:extended"))
  },
  "cohere/command-r-plus": {
    id: "cohere/command-r-plus",
    name: "Cohere: Command R+",
    description: "Command R+ is a new, 104B-parameter LLM from Cohere. It's useful for roleplay, general consumer usecases, and Retrieval Augmented Generation (RAG).",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("cohere/command-r-plus"))
  },
  "sophosympatheia/midnight-rose-70b": {
    id: "sophosympatheia/midnight-rose-70b",
    name: "Midnight Rose 70B",
    description: "A merge with a complex family tree, this model was crafted for roleplaying and storytelling. Midnight Rose is a successor to Rogue Rose and Aurora Nights and improves upon them both. It wants to produce lengthy output by default and is the best creative writing merge produced so far by sophosympatheia.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("sophosympatheia/midnight-rose-70b"))
  },
  "mancer/weaver": {
    id: "mancer/weaver",
    name: "Mancer: Weaver (alpha)",
    description: "An attempt to recreate Claude-style verbosity, but don't expect the same level of coherence or memory. Meant for use in roleplay/narrative situations.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("mancer/weaver"))
  },
  "gryphe/mythomax-l2-13b": {
    id: "gryphe/mythomax-l2-13b",
    name: "Mythomax L2 13B",
    description: "One of the highest performing and most popular fine-tunes of Llama 2 13B, with rich descriptions and roleplay.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("gryphe/mythomax-l2-13b"))
  },
  "neversleep/llama-3-lumimaid-8b": {
    id: "neversleep/llama-3-lumimaid-8b",
    name: "NeverSleep: Llama 3 Lumimaid 8B",
    description: "The NeverSleep team is back, with a Llama 3 8B finetune trained on their curated roleplay data. Striking a balance between eRP and RP, Lumimaid was designed to be serious, yet uncensored when necessary.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("neversleep/llama-3-lumimaid-8b"))
  },
  "meta-llama/llama-4-maverick": {
    id: "meta-llama/llama-4-maverick",
    name: "Meta: Llama 4 Maverick",
    description: "Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-experts (MoE) architecture with 128 experts and 17 billion active parameters per forward pass (400B total)",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("meta-llama/llama-4-maverick"))
  },
  "deepseek/deepseek-v3-base:free": {
    id: "deepseek/deepseek-v3-base:free",
    name: "DeepSeek: DeepSeek V3 Base (free)",
    description: "This is a base model mostly meant for testing, you need to provide detailed prompts for the model to return useful responses.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("deepseek/deepseek-v3-base:free"))
  },
  "deepseek/deepseek-chat-v3-0324:free": {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek: DeepSeek Chat V3 0324 (free)",
    description: "DeepSeek V3, a 685B-parameter, mixture-of-experts model, is the latest iteration of the flagship chat model family from the DeepSeek team.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("deepseek/deepseek-chat-v3-0324:free"))
  },
  "meta-llama/llama-3.1-405b:free": {
    id: "meta-llama/llama-3.1-405b:free",
    name: "Meta: Llama 3.1 405B (base) (free)",
    description: "Meta's latest class of model (Llama 3.1) launched with a variety of sizes & flavors. This is the base 405B pre-trained version.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("meta-llama/llama-3.1-405b:free"))
  },
  "google/gemini-2.5-flash-preview-05-20": {
    id: "google/gemini-2.5-flash-preview-05-20",
    name: "Google: Gemini 2.5 Flash Preview 05-20",
    description: "Gemini 2.5 Flash May 20th Checkpoint is Google's state-of-the-art workhorse model, specifically designed for advanced reasoning, coding, mathematics, and scientific tasks.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("google/gemini-2.5-flash-preview-05-20"))
  },
  "google/gemini-2.5-pro-preview": {
    id: "google/gemini-2.5-pro-preview",
    name: "Google: Gemini 2.5 Pro Preview",
    description: "Gemini 2.5 Pro is Google's state-of-the-art AI model designed for advanced reasoning, coding, mathematics, and scientific tasks. It employs \"thinking\" capabilities, enabling it to reason through responses with enhanced accuracy and nuanced context handling. Gemini 2.5 Pro achieves top-tier performance on multiple benchmarks, including first-place positioning on the LMArena leaderboard, reflecting superior human-preference alignment and complex problem-solving abilities.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("google/gemini-2.5-pro-preview"))
  },
  "inflection/inflection-3-pi": {
    id: "inflection/inflection-3-pi",
    name: "Inflection: Inflection 3 Pi",
    description: "Inflection 3 Pi powers Inflection's Pi chatbot, including backstory, emotional intelligence, productivity, and safety. It has access to recent news, and excels in scenarios like customer support and roleplay. Pi has been trained to mirror your tone and style, if you use more emojis, so will Pi! Try experimenting with various prompts and conversation styles.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("inflection/inflection-3-pi"))
  },
  "qwen/qwen-max": {
    id: "qwen/qwen-max",
    name: "Qwen: Qwen Max",
    description: "Qwen-Max, based on Qwen2.5, provides the best inference performance among Qwen models, especially for complex multi-step tasks. It's a large-scale MoE model that has been pretrained on over 20 trillion tokens and further post-trained with curated Supervised Fine-Tuning (SFT) and Reinforcement Learning from Human Feedback (RLHF) methodologies. The parameter count is unknown.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("qwen/qwen-max"))
  },
  "nothingiisreal/mn-celeste-12b": {
    id: "nothingiisreal/mn-celeste-12b",
    name: "Mistral Nemo 12B Celeste",
    description: "A specialized story writing and roleplaying model based on Mistral's NeMo 12B Instruct. Fine-tuned on curated datasets including Reddit Writing Prompts and Opus Instruct 25K. This model excels at creative writing, offering improved NSFW capabilities, with smarter and more active narration. It demonstrates remarkable versatility in both SFW and NSFW scenarios, with strong Out of Character (OOC) steering capabilities, allowing fine-tuned control over narrative direction and character behavior.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("nothingiisreal/mn-celeste-12b"))
  },
  "aion-labs/aion-rp-llama-3.1-8b": {
    id: "aion-labs/aion-rp-llama-3.1-8b",
    name: "AionLabs: Aion-RP 1.0 (8B)",
    description: "Aion-RP-Llama-3.1-8B ranks the highest in the character evaluation portion of the RPBench-Auto benchmark, a roleplaying-specific variant of Arena-Hard-Auto, where LLMs evaluate each other's responses. It is a fine-tuned base model rather than an instruct model, designed to produce more natural and varied writing.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("aion-labs/aion-rp-llama-3.1-8b"))
  },
  "arliai/qwq-32b-arliai-rpr-v1:free": {
    id: "arliai/qwq-32b-arliai-rpr-v1:free",
    name: "ArliAI: QwQ 32B RpR v1 (free)",
    description: "QwQ-32B-ArliAI-RpR-v1 is a 32B parameter model fine-tuned from Qwen/QwQ-32B using a curated creative writing and roleplay dataset originally developed for the RPMax series. It is designed to maintain coherence and reasoning across long multi-turn conversations by introducing explicit reasoning steps per dialogue turn, generated and refined using the base model itself.  The model was trained using RS-QLORA+ on 8K sequence lengths and supports up to 128K context windows (with practical performance around 32K). It is optimized for creative roleplay and dialogue generation, with an emphasis on minimizing cross-context repetition while preserving stylistic diversity.",
    category: "OpenRouter",
    provider: "openrouter",
    instance: asLanguageModel(openrouter("arliai/qwq-32b-arliai-rpr-v1:free"))
  }
};

// Helper functions
export const getModelIds = (): ModelId[] => 
  Object.keys(modelsRegistry) as ModelId[];

export const getModelCategories = (): string[] => {
  const categories = new Set<string>();
  Object.values(modelsRegistry).forEach(m => categories.add(m.category));
  return Array.from(categories).sort();
};

export const getModelsByCategory = (category: string): ModelMetadata[] =>
  Object.values(modelsRegistry)
    .filter(m => m.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));

export const getAllModels = (): ModelMetadata[] =>
  Object.values(modelsRegistry)
    .sort((a, b) => a.name.localeCompare(b.name));

export const getDefaultModel = (): ModelMetadata =>
  modelsRegistry[DEFAULT_MODEL_ID];

export const getModel = (modelId?: ModelId): ModelMetadata => {
  if (!modelId) {
    return getDefaultModel();
  }
  
  const model = modelsRegistry[modelId];
  if (!model) {
    console.error(`[models] ❌ Model not found in registry: ${modelId}`);
    console.error(`[models] Available models:`, Object.keys(modelsRegistry));
    return getDefaultModel();
  }
  
  return model;
};

// Get model instance with fallback to default
export const getModelInstance = (modelId?: ModelId): LanguageModel => {
  try {
    const model = getModel(modelId);
    if (!model.instance) {
      console.error(`[models] ❌ Model instance not found for ${modelId}, falling back to default`);
      return getDefaultModel().instance;
    }
    console.log(`[models] ✅ Retrieved model instance:`, {
      modelId: modelId || DEFAULT_MODEL_ID,
      actualModel: model.id,
      provider: model.provider
    });
    return model.instance;
  } catch (error) {
    console.error(`[models] ❌ Error getting model instance for ${modelId}:`, error);
    // Fallback to default model
    return getDefaultModel().instance;
  }
};

// Get max tokens with fallback to default
export const getMaxTokens = (modelId?: ModelId): number => 
  getModel(modelId).maxTokens || 4096;
