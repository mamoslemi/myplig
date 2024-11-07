import { Completer } from "./complete";
import { OpenAIComplete } from "./completers/openai/openai";
import { ChatGPTComplete } from "./completers/chatgpt/chatgpt";
import { JurassicJ2Complete } from "./completers/ai21/ai21";
import { GooseAIComplete } from "./completers/gooseai/gooseai";
import { OobaboogaComplete } from "./completers/oobabooga/oobabooga";
import { OllamaComplete } from "./completers/ollama/ollama";
import { GroqComplete } from "./completers/groq/groq";
import { LMStudioComplete } from "./completers/lmstudio/lmstudio";

export const available: Completer[] = [
	new ChatGPTComplete(),
	new OpenAIComplete(),
	new JurassicJ2Complete(),
	new GooseAIComplete(),
	new OobaboogaComplete(),
	new OllamaComplete(),
	new GroqComplete(),
	new LMStudioComplete(),
];

console.log("Available completers:", available.map(c => c.id));
