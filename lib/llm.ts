export async function completeJson<T>(options: {
  name: string;
  schema: Record<string, unknown>;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1600,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.name,
          strict: true,
          schema: options.schema,
        },
      },
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    console.error("[llm] request failed", response.status);
    throw new Error(`Model request failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response.");
  return JSON.parse(content) as T;
}
