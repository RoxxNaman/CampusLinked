import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function generateChatBotReply(
  prompt: string,
  chatContext: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return "I am the Kamand AI Assistant. GEMINI_API_KEY is not configured yet in the environment, but you can configure it under Settings > Secrets to unlock live generative responses!";
  }

  try {
    const formattedContents = [
      ...chatContext.map((c) => ({
        role: c.role,
        parts: [{ text: c.text }],
      })),
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: `You are the Kamand AI Assistant inside CampusLink — an interactive real-time messaging application for the KamandPrompt IIT Mandi Hackathon.
You are helpful, witty, knowledgeable about software engineering, WebSockets, computer science, and algorithms.
Keep chat responses concise, friendly, and formatted nicely with markdown when appropriate (code blocks, bullet points).
If someone asks you to summarize, provide clean bullet points.
If someone mentions code, provide high quality and secure advice.`,
      },
    });

    return response.text || 'No response generated.';
  } catch (err: any) {
    console.error('Error in Gemini generateChatBotReply:', err);
    return `Kamand AI was unable to process this request: ${err.message || 'API error'}`;
  }
}

export async function summarizeConversation(messages: Array<{ senderName: string; text: string }>): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return 'Summary unavailable: GEMINI_API_KEY is not configured.';
  }

  try {
    const transcript = messages
      .map((m) => `${m.senderName}: ${m.text}`)
      .slice(-30)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Please summarize the key points, decisions, and action items discussed in this chat conversation:\n\n${transcript}`,
      config: {
        systemInstruction: 'Provide a structured, executive summary with Key Highlights and Action Items in bullet points. Keep it clear and under 150 words.',
      },
    });

    return response.text || 'Unable to summarize.';
  } catch (err: any) {
    console.error('Error summarizing chat:', err);
    return `Summary generation failed: ${err.message || 'Unknown error'}`;
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `Translation unavailable: GEMINI_API_KEY is not configured. Original text: ${text}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Translate the following message into ${targetLanguage}:\n\n"${text}"\n\nOnly output the translation itself without extra conversational chatter.`,
    });

    return response.text || text;
  } catch (err: any) {
    console.error('Error translating text:', err);
    return text;
  }
}
