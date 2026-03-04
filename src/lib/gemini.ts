import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateLinkedInPost = async (topic: string, tone: string = "professional") => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a high-engaging LinkedIn post about ${topic}. The tone should be ${tone}. 
    
    STRICT CONSTRAINTS:
    - DO NOT use any emojis.
    - DO NOT use em-dashes (—).
    - DO NOT use markdown bolding (**).
    - Return ONLY the post content. No explanations, no introductory text, no conversational filler.
    
    Include relevant hashtags and a call to action at the end.`,
  });
  return response.text;
};

export const generateCommentReply = async (comment: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a thoughtful and professional reply to this LinkedIn comment: "${comment}".
    
    STRICT CONSTRAINTS:
    - DO NOT use any emojis.
    - DO NOT use em-dashes (—).
    - DO NOT use markdown bolding (**).
    - Return ONLY the reply text. No explanations or conversational filler.`,
  });
  return response.text;
};

export const generatePostDesign = async (content: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this LinkedIn post content: "${content}", suggest a visual design layout. 
    Return a JSON object with:
    - title: A catchy headline
    - body: 3-4 key bullet points
    - footer: A call to action or brand name
    - colorScheme: A suggestion (e.g., "LinkedIn Blue", "Modern Dark", "Clean White")`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          body: { type: Type.ARRAY, items: { type: Type.STRING } },
          footer: { type: Type.STRING },
          colorScheme: { type: Type.STRING },
        },
        required: ["title", "body", "footer", "colorScheme"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
};
