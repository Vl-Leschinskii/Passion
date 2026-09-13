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

export async function analyzeBookText(
  fileName: string,
  text: string,
): Promise<BookAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
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
- bilingual RU/EN fields required`;

  const user = `Source file name: ${fileName}\n\nBook text sample:\n${sample}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM returned non-JSON content");
  }

  return BookAnalysisSchema.parse(parsed);
}
