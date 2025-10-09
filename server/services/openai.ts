import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateAgentResponse(
  systemPrompt: string,
  tacitKnowledge: string,
  userMessage: string,
  conversationHistory: Array<{role: string, content: string}>
): Promise<{
  content: string;
  reasoning: string;
  requiresApproval: boolean;
  knowledgeUsed: string[];
}> {
  
  // First, let the reasoning engine analyze the query
  const reasoningPrompt = `
You are an autonomous reasoning engine. Analyze the user's query and determine:
1. What tools or knowledge sources should be consulted
2. What type of response is needed
3. Whether this is a high-risk scenario requiring human approval

User Query: "${userMessage}"
Available Tacit Knowledge: "${tacitKnowledge}"

Respond in JSON format with:
{
  "shouldConsultTacitKnowledge": boolean,
  "responseType": "standard" | "high_risk",
  "reasoning": "explanation of analysis",
  "knowledgeAreasNeeded": ["list", "of", "relevant", "areas"]
}
`;

  const reasoningResponse = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "user", content: reasoningPrompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024
  });

  const reasoning = JSON.parse(reasoningResponse.choices[0].message.content || "{}");

  // Now generate the actual response using the system prompt and tacit knowledge
  const messages = [
    { 
      role: "system" as const, 
      content: `${systemPrompt}\n\nPROPRIETARY KNOWLEDGE MODULE:\n${tacitKnowledge}\n\nIMPORTANT: Always prioritize the proprietary knowledge above over general information.`
    },
    ...conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    })),
    { role: "user" as const, content: userMessage }
  ];

  const agentResponse = await openai.chat.completions.create({
    model: "gpt-5",
    messages,
    max_completion_tokens: 2048
  });

  return {
    content: agentResponse.choices[0].message.content || "I apologize, but I couldn't generate a response.",
    reasoning: reasoning.reasoning || "Standard query processing",
    requiresApproval: reasoning.responseType === "high_risk",
    knowledgeUsed: reasoning.knowledgeAreasNeeded || []
  };
}

export async function processHumanApproval(
  originalResponse: string,
  approvalDecision: 'approve' | 'reject' | 'modify',
  systemPrompt: string,
  tacitKnowledge: string
): Promise<string> {
  
  if (approvalDecision === 'approve') {
    return originalResponse;
  }
  
  if (approvalDecision === 'reject') {
    return "The expert has rejected the proposed action. Please provide alternative guidance or ask a different question.";
  }
  
  // For modify, we would implement additional logic here
  return "The expert has requested modifications. Please clarify your requirements.";
}
