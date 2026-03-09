import OpenAI from "openai";

const OPENAI_KEY = (typeof process !== 'undefined' && process.env) ? process.env.OPENAI_API_KEY : '';
const openai = new OpenAI({ apiKey: OPENAI_KEY || "", dangerouslyAllowBrowser: true });

export async function analyzeUserStyle(posts: string[]) {
  const combinedPosts = posts.join("\n---\n");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a linguistics expert. Analyze the following LinkedIn posts and provide a concise set of "Style Guidelines" for how this person writes. 
        Focus on: 
        1. Sentence structure (short vs long).
        2. Use of lists/bullets.
        3. Tone (aggressive, helpful, witty, minimalist).
        4. Specific formatting quirks (e.g., lots of white space).
        
        Keep it under 100 words.`
      },
      {
        role: "user",
        content: `Analyze these posts: \n\n${combinedPosts}`
      }
    ]
  });
  return response.choices[0].message.content || "";
}

export async function generateLinkedInPost(topic: string, options: { tone?: string, hookTemplate?: string, userStyle?: string } = {}) {
  const { tone = "professional", hookTemplate, userStyle } = options;

  let contentPrompt = `Generate a high-engaging LinkedIn post about ${topic}. The general tone should be ${tone}.`;

  if (hookTemplate) {
    contentPrompt += `\n\nUSE THIS SPECIFIC HOOK TEMPLATE FOR THE FIRST TWO LINES: "${hookTemplate}"`;
  }

  if (userStyle) {
    contentPrompt += `\n\nMATCH THIS WRITING STYLE PERFECTLY: ${userStyle}`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `${contentPrompt}
    
    STRICT CONSTRAINTS:
    - DO NOT use any emojis.
    - DO NOT use em-dashes (—).
    - DO NOT use markdown bolding (**).
    - Return ONLY the post content. No explanations, no introductory text.
    - Use plenty of white space between paragraphs.
    
    Include relevant hashtags and a call to action at the end.`
      }
    ]
  });
  return response.choices[0].message.content || "";
}

export async function generateCommentReply(comment: string) {
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
}

export async function generatePostDesign(content: string) {
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
}
export async function analyzeBrainDump(dump: string) {
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
}
