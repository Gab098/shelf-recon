import { z } from "zod";

declare global {
  interface Window {
    puter?: any;
  }
}

export const PuterModelIdSchema = z.enum([
  "anthropic/claude-sonnet-4",
  "perplexity/sonar-pro",
  "openai/gpt-4o",
]);

export type PuterModelId = z.infer<typeof PuterModelIdSchema>;

function getPuter() {
  const puter = window.puter;
  if (!puter?.ai?.chat) {
    throw new Error(
      "Puter.js non e' disponibile. Assicurati che lo script Puter sia caricato e che la pagina sia in browser.",
    );
  }
  return puter;
}

export async function puterChatText(prompt: string, model: PuterModelId): Promise<string> {
  const puter = getPuter();

  const res = await puter.ai.chat(prompt, { model });

  if (typeof res === "string") return res;

  // Common shapes across SDKs / gateways.
  if (res?.message?.content && typeof res.message.content === "string") return res.message.content;
  if (Array.isArray(res?.choices) && res.choices[0]?.message?.content) return res.choices[0].message.content;
  if (res?.output_text && typeof res.output_text === "string") return res.output_text;

  return JSON.stringify(res);
}

export async function puterChatJson<TSchema extends z.ZodTypeAny>(
  prompt: string,
  model: PuterModelId,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const txt = await puterChatText(prompt, model);
  const maybeJson = extractFirstJsonObject(txt);
  const parsed = schema.safeParse(maybeJson);
  if (!parsed.success) {
    throw new Error(
      `Risposta AI non valida. Atteso JSON.\n\nRaw:\n${txt}\n\nErrors:\n${parsed.error.toString()}`,
    );
  }
  return parsed.data;
}

function extractFirstJsonObject(txt: string): unknown {
  // Fast path: already pure JSON.
  try {
    return JSON.parse(txt);
  } catch {
    // continue
  }

  // Try to locate a JSON object inside markdown/code fences.
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = txt.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // fall through
    }
  }

  throw new Error("Non riesco a estrarre JSON dalla risposta AI.");
}
