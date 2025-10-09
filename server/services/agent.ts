import { AgentStatusType, AgentResponse } from "@shared/schema";
import { generateAgentResponse, processHumanApproval } from "./gemini";

export class TacitAgent {
  private currentStatus: AgentStatusType = 'idle';
  private pendingResponse: any = null;

  constructor() {}

  getStatus(): AgentStatusType {
    return this.currentStatus;
  }

  async processMessage(
    userMessage: string,
    systemPrompt: string,
    tacitKnowledge: string,
    conversationHistory: Array<{role: string, content: string}>,
    hilEnabled: boolean
  ): Promise<AgentResponse> {
    
    this.currentStatus = 'reasoning';
    
    try {
      // Simulate reasoning delay for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.currentStatus = 'consulting_knowledge';
      
      // Simulate knowledge consultation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await generateAgentResponse(
        systemPrompt,
        tacitKnowledge,
        userMessage,
        conversationHistory
      );
      
      if (response.requiresApproval && hilEnabled) {
        this.currentStatus = 'awaiting_approval';
        this.pendingResponse = response;
        
        return {
          content: `⚠️ HIGH-RISK SCENARIO DETECTED\n\n**Proposed Action:** ${response.content}\n\n**Rationale:** ${response.reasoning}\n\n**Knowledge Used:** ${response.knowledgeUsed.join(', ')}\n\nThis action requires expert approval before proceeding.`,
          status: 'awaiting_approval',
          requiresApproval: true,
          reasoning: response.reasoning,
          knowledgeUsed: response.knowledgeUsed
        };
      }
      
      this.currentStatus = 'idle';
      return {
        content: response.content,
        status: 'idle',
        requiresApproval: false,
        reasoning: response.reasoning,
        knowledgeUsed: response.knowledgeUsed
      };
      
    } catch (error) {
      this.currentStatus = 'idle';
      throw new Error(`Agent processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleHumanApproval(
    decision: 'approve' | 'reject' | 'modify',
    systemPrompt: string,
    tacitKnowledge: string
  ): Promise<AgentResponse> {
    
    if (!this.pendingResponse || this.currentStatus !== 'awaiting_approval') {
      throw new Error('No pending action to approve');
    }
    
    const processedResponse = await processHumanApproval(
      this.pendingResponse.content,
      decision,
      systemPrompt,
      tacitKnowledge
    );
    
    this.pendingResponse = null;
    this.currentStatus = 'idle';
    
    return {
      content: processedResponse,
      status: 'idle',
      requiresApproval: false
    };
  }

  reset(): void {
    this.currentStatus = 'idle';
    this.pendingResponse = null;
  }
}

export const tacitAgent = new TacitAgent();
