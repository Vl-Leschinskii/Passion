import { z } from "zod";
import { sampleBookText } from "./extract-text";

const HeroSchema = z.object({
  nameRu: z.string().min(1),
  nameEn: z.string().min(1),
  subRu: z.string().min(1),
  subEn: z.string().min(1),
  group: z.enum(["passi", "garm", "sub"]),
  descRu: z.string().min(1),
  descEn: z.string().min(1),
  scores: z.tuple([
    z.number().min(-1).max(1),
    z.number().min(-1).max(1),
    z.number().min(-1).max(1),
    z.number().min(-1).max(1),
    z.number().min(-1).max(1),
  ]),
});

const BookAnalysisSchema = z.object({
  titleRu: z.string().min(1),
  titleEn: z.string().min(1),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  heroes: z.array(HeroSchema).min(3).max(12),
});

export type BookAnalysis = z.infer<typeof BookAnalysisSchema>;

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

function resolveApiKey(): string | null {
  const key =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  return key || null;
}

function resolveBaseUrl(): string {
  const explicit = process.env.OPENAI_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return DEEPSEEK_BASE;
}

function resolveModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEEPSEEK_MODEL;
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM returned non-JSON content");
  }
}

async function chatCompletion(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  useJsonObject: boolean;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (opts.useJsonObject) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${errBody.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return content;
}

export async function analyzeBookText(
  fileName: string,
  text: string,
): Promise<BookAnalysis> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error(
      "LLM API key is not set. Put DEEPSEEK_API_KEY (or OPENAI_API_KEY / LLM_API_KEY) in .env — get a key at https://platform.deepseek.com/api_keys",
    );
  }

  const baseUrl = resolveBaseUrl();
  const model = resolveModel();
  const sample = sampleBookText(text);

  const system = `You are a literary analyst. Extract major characters from a book and classify each with Lev Gumilev passionarity types and Big Five (OCEAN) scores from -1 to +1.
Return STRICT JSON only matching this shape:
{
  "titleRu": string,
  "titleEn": string,
  "slug": "lowercase-kebab",
  "heroes": [{
    "nameRu": string,
    "nameEn": string,
    "subRu": string,
    "subEn": string,
    "group": "passi" | "garm" | "sub",
    "descRu": string,
    "descEn": string,
    "scores": [O, C, E, A, N] // each -1..1
  }]
}
Rules:
- 5 to 10 main heroes only
- group: passi=passionary, garm=harmonic/persistent, sub=subpassionary
- scores order: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- bilingual RU/EN fields required
- Output JSON only, no markdown fences`;

  const user = `Source file name: ${fileName}\n\nBook text sample:\n${sample}`;

  let content: string;
  try {
    content = await chatCompletion({
      apiKey,
      baseUrl,
      model,
      system,
      user,
      useJsonObject: true,
    });
  } catch (firstErr) {
    // Some OpenAI-compatible providers (e.g. certain Qwen proxies) reject response_format.
    content = await chatCompletion({
      apiKey,
      baseUrl,
      model,
      system,
      user,
      useJsonObject: false,
    }).catch(() => {
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr));
    });
  }

  const parsed = extractJsonObject(content);
  return BookAnalysisSchema.parse(parsed);
}
