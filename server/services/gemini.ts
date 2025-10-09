import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_ENV_VAR || ""
);

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
  
  // Enhanced risk detection - check for high-risk financial scenarios
  const riskKeywords = [
    'withdraw', 'transfer', 'sell all', 'entire', 'retirement fund', 
    'life savings', 'mortgage', 'loan', 'borrow', 'leverage',
    'risky', 'speculative', 'gambling', 'crypto', 'bitcoin',
    'startup investment', 'high risk', 'all in'
  ];
  
  const userMessageLower = userMessage.toLowerCase();
  const isHighRisk = riskKeywords.some(keyword => userMessageLower.includes(keyword)) ||
                     (userMessageLower.includes('$') && 
                      (userMessageLower.includes('portfolio') || 
                       userMessageLower.includes('investment') ||
                       userMessageLower.includes('transfer')));
  
  const reasoning = isHighRisk 
    ? "Detected high-risk financial scenario - consulting tacit knowledge and flagging for review"
    : "Standard query processing";

  // Generate the response using Gemini 2.5 Flash (free, high-performance model)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
  });

  // Build conversation history for Gemini, prepending system context
  const systemContext = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nPROPRIETARY KNOWLEDGE MODULE:\n${tacitKnowledge}\n\nIMPORTANT: Always prioritize the proprietary knowledge above over general information.\n\nPlease acknowledge that you understand these instructions.`;
  
  const chatHistory = [
    {
      role: 'user',
      parts: [{ text: systemContext }]
    },
    {
      role: 'model',
      parts: [{ text: 'I understand. I will prioritize the proprietary knowledge module and follow all system instructions provided.' }]
    },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))
  ];
  
  const chat = model.startChat({
    history: chatHistory
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  const knowledgeAreas = tacitKnowledge.split('\n')
    .filter(line => line.trim().match(/^\d+\./))
    .map((_, idx) => `Rule ${idx + 1}`);

  return {
    content: response.text() || "I apologize, but I couldn't generate a response.",
    reasoning,
    requiresApproval: isHighRisk,
    knowledgeUsed: isHighRisk ? knowledgeAreas : []
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
