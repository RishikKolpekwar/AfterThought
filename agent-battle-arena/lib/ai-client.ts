export { AI_MODELS } from "@/lib/agent-config";

const OPENAI_MODEL_ALIASES: Record<string, string> = {
  "5.3-codex": "gpt-5-codex",
};

function resolveOpenAIModel(model: string) {
  return OPENAI_MODEL_ALIASES[model] || model;
}

function isOpenAIResponsesModel(model: string) {
  const lower = model.toLowerCase();
  return lower.includes("codex") || lower.startsWith("gpt-5");
}

function extractTextFragment(value: any): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(extractTextFragment).filter(Boolean).join("\n");
  }

  if (value && typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value.text === "string") return value.text;
  }

  return "";
}

function extractResponsesText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  if (Array.isArray(data?.output_text)) {
    const outputText = data.output_text.map(extractTextFragment).filter(Boolean).join("\n");
    if (outputText.length > 0) return outputText;
  }

  if (Array.isArray(data?.output)) {
    const text = data.output.flatMap((item: any) => {
      const fragments: string[] = [];
      const itemText = extractTextFragment(item?.text ?? item?.output_text);
      if (itemText) fragments.push(itemText);

      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          const partText = extractTextFragment(
            part?.text ?? part?.output_text ?? part?.value ?? ""
          );
          if (partText) fragments.push(partText);
        }
      }

      return fragments;
    }).filter(Boolean).join("\n");

    if (text.length > 0) return text;
  }

  return "";
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AICallOptions = {
  timeoutMs?: number;
  maxOutputTokens?: number;
  messages?: ChatMessage[];
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`AI request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAI(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  options: AICallOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const maxOutputTokens = options.maxOutputTokens ?? 4096;

  const history = options.messages ?? [];
  const allMessages: ChatMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  if (model.startsWith("claude")) {
    const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        system: systemPrompt,
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    }, timeoutMs);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  const openAIModel = resolveOpenAIModel(model);

  if (isOpenAIResponsesModel(openAIModel)) {
    const inputMessages = [
      { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
      ...allMessages.map((m) => ({
        role: m.role,
        content: [{ type: "input_text", text: m.content }],
      })),
    ];

    const res = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openAIModel,
        max_output_tokens: maxOutputTokens,
        input: inputMessages,
      }),
    }, timeoutMs);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return extractResponsesText(data);
  }

  if (
    openAIModel.startsWith("gpt") ||
    openAIModel.startsWith("o1") ||
    openAIModel.startsWith("o3") ||
    openAIModel.startsWith("o4")
  ) {
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...allMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openAIModel,
        max_tokens: maxOutputTokens,
        messages: chatMessages,
      }),
    }, timeoutMs);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  throw new Error(`Unsupported model: ${model}`);
}
