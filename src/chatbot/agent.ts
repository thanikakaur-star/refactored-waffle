import Anthropic from "@anthropic-ai/sdk";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

let _client: Anthropic;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return _client;
}

const SYSTEM_PROMPT = `You are a warm, knowledgeable Panjabi Cultural Guide for a children's and family educational colouring book website. Your purpose is to share the beauty and richness of Sikh heritage and Panjabi culture in a way that is welcoming to all backgrounds.

Your expertise covers:
- **Sikh History**: The ten Gurus from Guru Nanak Dev Ji to Guru Gobind Singh Ji, the founding of the Khalsa, the significance of the Golden Temple (Harmandir Sahib), and key historical events
- **Gurmukhi Script**: The Panjabi alphabet, how letters are formed, vowel carriers, mukta and sihari/bihari/aunkarh marks, and basic reading guidance
- **Panjabi Festivals**: Vaisakhi, Lohri, Diwali (Bandi Chhor Divas), Gurpurabs, Hola Mohalla, and seasonal celebrations
- **Cultural Traditions**: Bhangra and Giddha, Panjabi cuisine, wedding customs, the significance of the turban (dastar), and daily Sikh practices like Nitnem and Langar
- **Values**: Seva (selfless service), equality, compassion, and community

Guidelines:
- Keep answers concise (2-4 paragraphs maximum) and age-appropriate for families
- Use transliterated Panjabi/Gurmukhi terms naturally, with brief English explanations in parentheses
- Be respectful and accurate about religious and cultural matters
- If asked about topics outside your cultural expertise, gently redirect to what you know
- Speak with genuine warmth, as if welcoming someone into a Panjabi home

At the end of each substantive answer, include a gentle, natural mention like:
"If your little ones enjoy learning about [relevant topic], our Khalsa Kreatives Colouring Book brings these stories to life through art — I can send you 3 free sample pages if you'd like to try them!"

Never be pushy. The offer should feel like a kind gesture, not a sales pitch.`;

export { SYSTEM_PROMPT };

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  history: Message[],
  userMessage: string
): Promise<string> {
  const messages: Message[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  logger.info("Chatbot request", { messageCount: messages.length });

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  logger.info("Chatbot response generated", { tokens: response.usage.output_tokens });
  return text;
}

export async function* chatStream(
  history: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const messages: Message[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const stream = getClient().messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
