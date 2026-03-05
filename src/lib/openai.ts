import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "", dangerouslyAllowBrowser: true });

export const generateLinkedInPost = async (topic: string, tone: string = "professional") => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Generate a high-engaging LinkedIn post about ${topic}. The tone should be ${tone}. 
    
    STRICT CONSTRAINTS:
    - DO NOT use any emojis.
    - DO NOT use em-dashes (—).
    - DO NOT use markdown bolding (**).
    - Return ONLY the post content. No explanations, no introductory text, no conversational filler.
    
    Include relevant hashtags and a call to action at the end.`
      }
    ]
  });
  return response.choices[0].message.content || "";
};

export const generateCommentReply = async (comment: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Generate a thoughtful and professional reply to this LinkedIn comment: "${comment}".
    
    STRICT CONSTRAINTS:
    - DO NOT use any emojis.
    - DO NOT use em-dashes (—).
    - DO NOT use markdown bolding (**).
    - Return ONLY the reply text. No explanations or conversational filler.`
      }
    ]
  });
  return response.choices[0].message.content || "";
};

export const generatePostDesign = async (content: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a visual design assistant. Return a JSON object with:
    - title: A catchy headline
    - body: An array of 3-4 key bullet points (strings)
    - footer: A call to action or brand name
    - colorScheme: A suggestion (e.g., "LinkedIn Blue", "Modern Dark", "Clean White")`
      },
      {
        role: "user",
        content: `Based on this LinkedIn post content: "${content}", suggest a visual design layout.`
      }
    ]
  });
  return JSON.parse(response.choices[0].message.content || "{}");
};
export const analyzeBrainDump = async (dump: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a LinkedIn content strategist. Analyze the user's brain dump and generate 3-4 distinct, high-quality post options.
        Return a JSON object with a 'posts' array, where each object has:
        - content: The full post text
        - hook: A one-sentence explanation of why this post works
        - style: The format (e.g., "Story-based", "List-based", "Controversial", "Educational")
        
        STRICT CONSTRAINTS for content:
        - DO NOT use any emojis.
        - DO NOT use em-dashes (—).
        - DO NOT use markdown bolding (**).`
      },
      {
        role: "user",
        content: `Brain dump: ${dump}`
      }
    ]
  });
  return JSON.parse(response.choices[0].message.content || '{"posts": []}');
};
