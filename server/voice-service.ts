import { db } from "./db";
import { 
  voiceSettings, 
  voiceCalls, 
  voiceConversations, 
  operations,
  supportTickets,
  supportCategories,
  aiDirectives,
  customerSupportEmails,
  VoiceSettings,
  VoiceCall,
  InsertVoiceCall,
  InsertVoiceConversation
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";
import { CustomerOrderService } from "./customer-order-service";
import { SupportService } from "./support-service-fixed";
import Telnyx from 'telnyx';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Portuguese female voice (Adam)

interface TelnyxCallWebhookData {
  call_control_id: string;
  call_leg_id: string;
  from: string;
  to: string;
  direction: string;
  state: string;
  duration?: string;
  start_time?: string;
  end_time?: string;
  event_type: string;
  occurred_at: string;
}

export class VoiceService {
  private customerOrderService: CustomerOrderService;
  private supportService: SupportService;
  private telnyxClient: Telnyx | null;
  
  // High-performance transcription state management
  private transcriptionActive = new Map<string, boolean>();
  private transcriptionBuffer = new Map<string, string>();
  private lastTranscriptionTime = new Map<string, number>();
  private processingQueue = new Map<string, Promise<void>>();
  private conversationContext = new Map<string, any[]>();
  private isProcessingResponse = new Map<string, boolean>();
  private processingTimeouts = new Map<string, NodeJS.Timeout>();
  private conversationStarted = new Map<string, boolean>();
  private isSofiaSpeaking = new Map<string, boolean>();
  private activeCallIds = new Set<string>();  // Track active calls to prevent commands on ended calls

  constructor() {
    this.customerOrderService = new CustomerOrderService();
    this.supportService = new SupportService();
    
    // Initialize Telnyx client for call control
    const apiKey = process.env.TELNYX_API_KEY;
    if (apiKey) {
      this.telnyxClient = new Telnyx(apiKey);
    } else {
      console.warn('⚠️ TELNYX_API_KEY not configured - call control will not function');
      this.telnyxClient = null;
    }
  }

  /**
   * Get voice settings for an operation
   */
  async getVoiceSettings(operationId: string): Promise<VoiceSettings | null> {
    try {
      const [settings] = await db
        .select()
        .from(voiceSettings)
        .where(eq(voiceSettings.operationId, operationId))
        .limit(1);

      return settings || null;
    } catch (error) {
      console.error('Error getting voice settings:', error);
      throw error;
    }
  }

  /**
   * Save voice settings for an operation
   */
  async saveVoiceSettings(operationId: string, settings: Partial<VoiceSettings>): Promise<VoiceSettings> {
    try {
      const existingSettings = await this.getVoiceSettings(operationId);
      
      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db
          .update(voiceSettings)
          .set({
            ...settings,
            updatedAt: new Date(),
          })
          .where(eq(voiceSettings.operationId, operationId))
          .returning();
        
        return updatedSettings;
      } else {
        // Create new settings
        const [newSettings] = await db
          .insert(voiceSettings)
          .values({
            operationId,
            ...settings,
          })
          .returning();
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
      throw error;
    }
  }

  /**
   * Check if voice service is active and within operating hours
   */
  async isVoiceServiceAvailable(operationId: string): Promise<{
    available: boolean;
    reason?: string;
    settings?: VoiceSettings;
  }> {
    try {
      const settings = await this.getVoiceSettings(operationId);
      
      if (!settings || !settings.isActive) {
        return { available: false, reason: 'service_disabled' };
      }

      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()] as keyof NonNullable<typeof settings.operatingHours>;
      const currentTime = now.toTimeString().substring(0, 5);
      
      if (!settings.operatingHours) {
        return { available: true, settings }; // Default to available if no hours set
      }
      
      const dayConfig = settings.operatingHours[currentDay];
      
      if (!dayConfig || typeof dayConfig === 'string' || !dayConfig.enabled) {
        return { available: false, reason: 'day_disabled', settings };
      }

      if (currentTime < dayConfig.start || currentTime > dayConfig.end) {
        return { available: false, reason: 'outside_hours', settings };
      }

      return { available: true, settings };
    } catch (error) {
      console.error('Error checking voice service availability:', error);
      return { available: false, reason: 'error' };
    }
  }

  /**
   * Handle incoming call from Telnyx
   */
  async handleIncomingCall(callData: TelnyxCallWebhookData, callType: string = 'test'): Promise<void> {
    try {
      console.log(`📞 Handling incoming call: ${callData.call_control_id} from ${callData.from} to ${callData.to}`);
      
      // Check if Telnyx client is available
      if (!this.telnyxClient) {
        console.error('❌ Telnyx client not configured - cannot handle call');
        // Return gracefully without throwing - webhook should get 200 OK
        return;
      }
      
      // Extract operation from phone number (will need routing logic)
      const operationId = await this.getOperationFromPhoneNumber(callData.to);
      
      if (!operationId) {
        console.log(`❌ No operation found for phone number ${callData.to}`);
        await this.hangupCall(callData.call_control_id, 'Número não encontrado');
        return;
      }

      const availability = await this.isVoiceServiceAvailable(operationId);
      
      // For outbound calls, we don't handle availability differently - we control the call
      if (!availability.available && callData.direction === 'incoming') {
        console.log(`🚫 Voice service not available: ${availability.reason}`);
        await this.handleOutOfHoursCall(callData.call_control_id, availability.reason!, availability.settings);
        return;
      }
      
      // For outbound calls, skip availability check and proceed
      if (callData.direction === 'outgoing') {
        console.log(`📞 Outbound call initiated - waiting for call.answered event`);
        console.log(`🌍 International call routing: US ${callData.from} -> Brazil ${callData.to}`);
        console.log(`🔗 Webhook connection_id: ${callData.connection_id}`);
        
        // Just create the call record, don't answer or start AI yet
        const callRecord: InsertVoiceCall = {
          operationId,
          telnyxCallControlId: callData.call_control_id,
          telnyxCallLegId: callData.call_leg_id,
          direction: callData.direction.toLowerCase() as 'inbound' | 'outbound',
          fromNumber: callData.from,
          toNumber: callData.to,
          status: callData.state.toLowerCase(),
          customerPhone: this.normalizePhoneNumber(callData.to), // For outbound, customer is the 'to'
          startTime: callData.start_time ? new Date(callData.start_time) : new Date(),
          twilioCallSid: 'telnyx-' + callData.call_control_id.substring(3, 20), // Generate compatible ID for legacy field
        };
        await db.insert(voiceCalls).values(callRecord);
        return;
      }

      // Create call record
      const callRecord: InsertVoiceCall = {
        operationId,
        telnyxCallControlId: callData.call_control_id,
        telnyxCallLegId: callData.call_leg_id,
        direction: callData.direction.toLowerCase() as 'inbound' | 'outbound',
        fromNumber: callData.from,
        toNumber: callData.to,
        status: callData.state.toLowerCase(),
        customerPhone: this.normalizePhoneNumber(callData.from),
        startTime: callData.start_time ? new Date(callData.start_time) : new Date(),
        twilioCallSid: 'telnyx-' + callData.call_control_id.substring(3, 20), // Generate compatible ID for legacy field
      };

      await db.insert(voiceCalls).values(callRecord);

      // Answer the call using Telnyx REST API
      await this.answerCall(callData.call_control_id);
      
      // Start media stream and AI conversation
      await this.startAIConversation(callData.call_control_id, operationId, callType);
      
    } catch (error) {
      console.error('Error handling incoming call:', error);
      console.log(`🔍 Call Debug Info:`, {
        direction: callData.direction,
        from: callData.from,
        to: callData.to,
        state: callData.state,
        connection_id: callData.connection_id || 'not provided'
      });
      // Only try to hangup if we have a client
      if (this.telnyxClient) {
        await this.hangupCall(callData.call_control_id, 'Erro interno do servidor');
      }
    }
  }

  /**
   * Handle call answered event (when someone picks up an outbound call)
   */
  async handleCallAnswered(callData: TelnyxCallWebhookData, callType: string = 'test'): Promise<void> {
    try {
      console.log(`📞 Call answered: ${callData.call_control_id}`);
      
      // Mark call as active
      this.activeCallIds.add(callData.call_control_id);
      
      // Get the call from database
      const [call] = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.telnyxCallControlId, callData.call_control_id))
        .limit(1);
      
      if (!call) {
        console.error(`❌ Call not found in database: ${callData.call_control_id}`);
        this.activeCallIds.delete(callData.call_control_id);  // Clean up if call not found
        return;
      }
      
      // Update call status
      await db
        .update(voiceCalls)
        .set({
          status: 'answered',
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.telnyxCallControlId, callData.call_control_id));
      
      // Start AI conversation now that call is answered
      await this.startAIConversation(callData.call_control_id, call.operationId, callType);
      
      console.log(`✅ AI conversation started for answered call ${callData.call_control_id}`);
    } catch (error) {
      console.error('Error handling call answered:', error);
    }
  }

  /**
   * Handle speak ended event - activate conversation system
   */
  async handleSpeakEnded(callData: any, callType: string = 'test', operationId: string): Promise<void> {
    try {
      console.log(`🎙️ Speak ended for call ${callData.call_control_id} - reactivating transcription`);
      
      // Mark Sofia as no longer speaking
      this.isSofiaSpeaking.set(callData.call_control_id, false);
      
      // Check if this was a welcome message (based on client_state)
      const clientState = callData.client_state;
      let decodedState = null;
      
      if (clientState) {
        try {
          decodedState = JSON.parse(Buffer.from(clientState, 'base64').toString());
        } catch (e) {
          console.warn('⚠️ Could not decode client_state:', e);
        }
      }
      
      // If transcription is active, resume it after speaking
      if (this.transcriptionActive.get(callData.call_control_id)) {
        console.log(`🎤 Resuming real-time transcription after Sofia finished speaking`);
        await this.resumeTranscription(callData.call_control_id);
        
        // Set a timeout to fallback to gather if no transcription received
        const timeout = setTimeout(async () => {
          // Check if call is still active before attempting fallback
          if (!this.activeCallIds.has(callData.call_control_id)) {
            console.log(`⚠️ Call ${callData.call_control_id} already ended, skipping fallback`);
            return;
          }
          
          const lastTime = this.lastTranscriptionTime.get(callData.call_control_id) || 0;
          const timeSinceLastTranscription = Date.now() - lastTime;
          
          if (timeSinceLastTranscription > 8000) { // 8 seconds without transcription
            console.log(`⏱️ No transcription received for 8s, falling back to gather_using_ai`);
            this.transcriptionActive.set(callData.call_control_id, false);
            await this.startSpeechGather(callData.call_control_id, decodedState?.operationId || operationId, decodedState?.callType || callType);
          }
        }, 8000);
        
        // Store timeout reference for cleanup
        this.processingTimeouts.set(callData.call_control_id, timeout);
      } 
      // Fallback to gather_using_ai if transcription is not active
      else if (decodedState?.action === 'speaking_welcome') {
        console.log(`✅ Welcome message completed - starting speech recognition`);
        // Try transcription first, fallback to gather if it fails
        try {
          await this.startRealTimeTranscription(callData.call_control_id, operationId, callType);
          this.transcriptionActive.set(callData.call_control_id, true);
        } catch (error) {
          console.log(`🔄 Transcription failed, falling back to gather_using_ai`);
          await this.startSpeechGather(callData.call_control_id, operationId, callType);
        }
      } else if (decodedState?.action === 'speaking_response') {
        console.log(`✅ Sofia finished responding - continuing conversation`);
        // Try to resume transcription, fallback to gather if needed
        if (!this.transcriptionActive.get(callData.call_control_id)) {
          await this.startSpeechGather(callData.call_control_id, decodedState.operationId || operationId, decodedState.callType || callType);
        }
      } else {
        console.log(`ℹ️ Speak ended but not a conversation action - skipping`);
      }
      
    } catch (error) {
      console.error('Error handling speak ended:', error);
    }
  }

  /**
   * Handle speak started - enable barge-in detection
   */
  async handleSpeakStarted(callData: any, callType: string, operationId: string): Promise<void> {
    try {
      console.log(`🎙️ Sofia started speaking - enabling barge-in for call ${callData.call_control_id}`);
      
      // Mark Sofia as speaking
      this.isSofiaSpeaking.set(callData.call_control_id, true);
      
      // Check client_state to see if this is an AI response (not welcome message)
      const clientState = callData.client_state;
      let decodedState = null;
      
      if (clientState) {
        try {
          decodedState = JSON.parse(Buffer.from(clientState, 'base64').toString());
        } catch (e) {
          console.warn('⚠️ Could not decode client_state:', e);
        }
      }
      
      // Enable barge-in for ALL Sofia responses (including welcome)
      // This allows the user to interrupt at any time
      const isSofiaSpeaking = decodedState?.action === 'speaking_ai_response' || 
                             decodedState?.action === 'speaking_response' ||
                             decodedState?.action === 'speaking_welcome';
      
      if (isSofiaSpeaking) {
        console.log(`🎤 Enabling barge-in - user can interrupt Sofia anytime`);
        
        // Start parallel speech detection while Sofia is speaking
        // This will allow user to interrupt Sofia at any time
        await this.startBargeInDetection(callData.call_control_id, operationId, callType);
      } else {
        console.log(`ℹ️ Not a Sofia speech event, skipping barge-in`);
      }
      
    } catch (error) {
      console.error('Error handling speak started:', error);
    }
  }

  /**
   * Simplified barge-in detection (disabled for now to avoid complexity)
   */
  private async startBargeInDetection(callControlId: string, operationId: string, callType: string): Promise<void> {
    try {
      console.log(`🎤 Enabling barge-in detection for call ${callControlId}`);
      
      // When user speaks while Sofia is talking, we should:
      // 1. Stop Sofia's current speech
      // 2. Listen to what the user is saying
      // 3. Respond appropriately
      
      // Check if transcription is active
      if (this.transcriptionActive.get(callControlId)) {
        console.log(`✔️ Transcription is active - user can now interrupt Sofia`);
        // The real-time transcription will detect if user speaks
        // When detected, it will call processTranscription which will stop Sofia
      } else {
        console.log(`🔄 Starting transcription to enable barge-in`);
        // Start transcription so we can detect user speech
        await this.startRealTimeTranscription(callControlId);
        this.transcriptionActive.set(callControlId, true);
      }
      
    } catch (error) {
      console.error('❌ Error enabling barge-in detection:', error);
    }
  }

  /**
   * Handle call status updates from Telnyx
   */
  async handleCallStatusUpdate(callData: TelnyxCallWebhookData): Promise<void> {
    try {
      // If this is a hangup or end event, mark call as inactive
      if (callData.event_type === 'call.hangup' || callData.state === 'hangup' || callData.state === 'completed') {
        this.activeCallIds.delete(callData.call_control_id);
        
        // Clear any pending timeouts
        const timeout = this.processingTimeouts.get(callData.call_control_id);
        if (timeout) {
          clearTimeout(timeout);
          this.processingTimeouts.delete(callData.call_control_id);
        }
        
        // Clean up all state for this call
        this.transcriptionActive.delete(callData.call_control_id);
        this.transcriptionBuffer.delete(callData.call_control_id);
        this.lastTranscriptionTime.delete(callData.call_control_id);
        this.conversationContext.delete(callData.call_control_id);
        this.isProcessingResponse.delete(callData.call_control_id);
        this.conversationStarted.delete(callData.call_control_id);
        this.isSofiaSpeaking.delete(callData.call_control_id);
        
        console.log(`📞 Call ${callData.call_control_id} ended - cleaned up all state`);
      }
      
      await db
        .update(voiceCalls)
        .set({
          status: callData.state ? callData.state.toLowerCase() : 'completed',
          duration: callData.duration ? parseInt(callData.duration) : null,
          endTime: callData.end_time ? new Date(callData.end_time) : null,
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.telnyxCallControlId, callData.call_control_id));

      console.log(`📞 Call ${callData.call_control_id} status updated to ${callData.state}`);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  /**
   * Process conversation with AI using existing Sofia architecture
   */
  async processConversationWithAI(
    callSid: string, 
    customerMessage: string, 
    conversationHistory: any[] = [],
    hasStarted: boolean = false
  ): Promise<{
    response: string;
    shouldCreateTicket: boolean;
    suggestedCategory?: string;
    detectedIntent?: string;
  }> {
    try {
      // Get call data
      const [call] = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.telnyxCallControlId, callSid))
        .limit(1);

      if (!call) {
        throw new Error('Call not found');
      }

      // Get customer context (reusing existing logic from email support)
      const customerContext = await this.getCustomerContext(call.customerPhone, call.customerEmail);
      
      // Get AI directives for this operation (reusing Sofia's architecture)
      const directives = await this.getActiveDirectives(call.operationId);
      
      // Build AI prompt for voice conversation with context awareness
      const prompt = await this.buildVoiceConversationPrompt(
        call,
        customerMessage,
        conversationHistory,
        directives,
        customerContext,
        hasStarted
      );

      // Call OpenAI for response
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300, // Shorter for voice responses
      });

      const aiResponseText = response.choices[0].message.content || "Desculpe, não consegui processar sua solicitação.";
      
      // Parse response for structured data
      const aiResponse = this.parseAIVoiceResponse(aiResponseText);
      
      // Save conversation
      const conversationData: InsertVoiceConversation = {
        callId: call.id,
        type: 'customer_speech',
        speaker: 'customer',
        content: customerMessage,
        timestamp: new Date(),
      };
      
      await db.insert(voiceConversations).values(conversationData);
      
      const aiConversationData: InsertVoiceConversation = {
        callId: call.id,
        type: 'ai_response',
        speaker: 'ai',
        content: aiResponse.response,
        timestamp: new Date(),
      };
      
      await db.insert(voiceConversations).values(aiConversationData);

      // Update call with AI response flag and intent
      await db
        .update(voiceCalls)
        .set({
          aiResponseGenerated: true,
          detectedIntent: aiResponse.detectedIntent,
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.id, call.id));

      return {
        response: aiResponse.response,
        shouldCreateTicket: aiResponse.shouldCreateTicket,
        suggestedCategory: aiResponse.suggestedCategory,
        detectedIntent: aiResponse.detectedIntent,
      };

    } catch (error) {
      console.error('Error processing AI conversation:', error);
      return {
        response: "Desculpe, estou com dificuldades técnicas no momento. Posso transferir você para um atendente humano?",
        shouldCreateTicket: true,
        detectedIntent: 'technical_error',
      };
    }
  }

  /**
   * Create support ticket from voice call
   */
  async createTicketFromCall(callSid: string, category?: string): Promise<string | null> {
    try {
      const [call] = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.telnyxCallControlId, callSid))
        .limit(1);

      if (!call) {
        return null;
      }

      // Get conversation history
      const conversations = await db
        .select()
        .from(voiceConversations)
        .where(eq(voiceConversations.callId, call.id))
        .orderBy(voiceConversations.timestamp);

      // Build conversation summary
      const conversationSummary = conversations
        .map(conv => `${conv.speaker === 'customer' ? 'Cliente' : 'IA'}: ${conv.content}`)
        .join('\n');

      // Find category ID
      let categoryId = null;
      if (category) {
        const [categoryRecord] = await db
          .select()
          .from(supportCategories)
          .where(eq(supportCategories.name, category.toLowerCase()))
          .limit(1);
        
        categoryId = categoryRecord?.id || null;
      }

      // Create a placeholder email record first (required for ticket)
      const [emailRecord] = await db
        .insert(customerSupportEmails)
        .values({
          operationId: call.operationId,
          messageId: `voice-${call.telnyxCallControlId}`,
          fromEmail: call.customerEmail || `${call.customerPhone}@voice.local`,
          toEmail: 'suporte@voice.local',
          subject: `Chamada de voz - ${call.detectedIntent || 'Atendimento geral'}`,
          textContent: conversationSummary,
          htmlContent: conversationSummary.replace(/\n/g, '<br>'),
          status: 'processed',
        })
        .returning();

      // Create support ticket
      const ticketNumber = `VOZ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const [ticket] = await db
        .insert(supportTickets)
        .values({
          ticketNumber,
          emailId: emailRecord.id,
          subject: `Chamada de voz - ${call.detectedIntent || 'Atendimento geral'}`,
          description: `Conversa por telefone iniciada em ${call.startTime?.toLocaleString('pt-BR')}.\n\nHistórico da conversa:\n${conversationSummary}`,
          customerName: call.customerName || call.customerPhone || 'Cliente',
          customerEmail: call.customerEmail || `${call.customerPhone}@voice.local`,
          priority: 'medium',
          status: 'open',
          categoryId: categoryId!,
        })
        .returning();

      // Link ticket to call
      await db
        .update(voiceCalls)
        .set({
          relatedTicketId: ticket.id,
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.id, call.id));

      console.log(`🎫 Created ticket ${ticket.ticketNumber} from call ${callSid}`);
      
      return ticket.id;
    } catch (error) {
      console.error('Error creating ticket from call:', error);
      return null;
    }
  }

  /**
   * Get operation from phone number (will need routing configuration)
   */
  private async getOperationFromPhoneNumber(phoneNumber: string): Promise<string | null> {
    try {
      // For now, return the first active operation
      // TODO: Implement proper phone number routing
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.status, 'active'))
        .limit(1);
      
      return operation?.id || null;
    } catch (error) {
      console.error('Error getting operation from phone number:', error);
      return null;
    }
  }

  /**
   * Get customer context for AI (reusing existing customer order service)
   */
  private async getCustomerContext(phone?: string | null, email?: string | null) {
    try {
      if (email) {
        return await this.customerOrderService.getCustomerStats(email);
      }
      
      if (phone) {
        // Try to find orders by phone number
        // This would need to be implemented in CustomerOrderService
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting customer context:', error);
      return null;
    }
  }

  /**
   * Get active AI directives (reusing from support service)
   */
  private async getActiveDirectives(operationId: string) {
    return await db
      .select()
      .from(aiDirectives)
      .where(and(
        eq(aiDirectives.operationId, operationId),
        eq(aiDirectives.isActive, true)
      ))
      .orderBy(aiDirectives.sortOrder, aiDirectives.createdAt);
  }

  /**
   * Build AI prompt for voice conversation (intelligent & dynamic using AI directives)
   */
  private async buildVoiceConversationPrompt(
    call: VoiceCall,
    customerMessage: string,
    conversationHistory: any[],
    directives: any[],
    customerContext: any,
    hasStarted: boolean = false
  ): Promise<string> {
    // Group directives by type (same as email support)
    const directivesByType = directives.reduce((acc, directive: any) => {
      if (!acc[directive.type]) acc[directive.type] = [];
      acc[directive.type].push(directive);
      return acc;
    }, {} as Record<string, any[]>);

    // Build store information section using directives
    const storeInfoSection = directivesByType.store_info?.length > 0 
      ? `INFORMAÇÕES DA EMPRESA:
${directivesByType.store_info.map((d: any) => `- ${d.content}`).join('\n')}
` 
      : `INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)
- Pagamento: Na entrega (COD - Cash on Delivery)  
- Horário: Segunda a sexta, 9h às 18h
`;

    // Build product information section using directives
    const productInfoSection = directivesByType.product_info?.length > 0 
      ? `
INFORMAÇÕES DOS PRODUTOS:
${directivesByType.product_info.map((d: any) => `- ${d.content}`).join('\n')}
` 
      : '';

    // Build response style section using directives
    const responseStyleSection = directivesByType.response_style?.length > 0 
      ? `
DIRETRIZES DE ATENDIMENTO PERSONALIZADAS:
${directivesByType.response_style.map((d: any) => `- ${d.content}`).join('\n')}
` 
      : '';

    // Build custom directives section
    const customSection = directivesByType.custom?.length > 0 
      ? `
DIRETRIZES ESPECÍFICAS DA OPERAÇÃO:
${directivesByType.custom.map((d: any) => `- ${d.title}: ${d.content}`).join('\n')}
` 
      : '';

    // Analyze customer message for emotional context and intent
    const emotionalAnalysis = this.analyzeVoiceEmotionalContext(customerMessage);
    
    // Build emotional context section for voice
    const emotionalContextSection = `
CONTEXTO EMOCIONAL DO CLIENTE (VOZ):
- Tom detectado: ${emotionalAnalysis.tone}
- Urgência: ${emotionalAnalysis.urgency}
- Intenção principal: ${emotionalAnalysis.intent}
- Necessita atenção especial: ${emotionalAnalysis.needsSpecialAttention ? 'Sim' : 'Não'}

INSTRUÇÕES BASEADAS NO CONTEXTO EMOCIONAL:
${emotionalAnalysis.tone === 'irritado' || emotionalAnalysis.tone === 'frustrado' ? 
  '- Use voz mais calma e empática\n- Demonstre compreensão imediata da situação\n- Priorize soluções rápidas' : ''}
${emotionalAnalysis.urgency === 'alta' ? 
  '- Cliente demonstra urgência - seja mais direta e eficaz\n- Evite explicações longas, foque na solução' : ''}
${emotionalAnalysis.needsSpecialAttention ? 
  '- ATENÇÃO: Situação requer cuidado especial - seja extra empática\n- Considere transferir para atendimento humano se necessário' : ''}
${emotionalAnalysis.intent === 'reclamação' ? 
  '- Cliente está reclamando - ouça ativamente e valide os sentimentos\n- Ofereça soluções concretas' : ''}

`;

    // Build customer context section with intelligence
    const customerContextSection = customerContext ? `
PERFIL DO CLIENTE:
- Histórico: ${customerContext.totalOrders} pedidos (${customerContext.deliveredOrders} entregues)
- Valor total: €${customerContext.totalValue}
- Categoria: ${customerContext.customerType}
- Reputação: ${customerContext.customerType === 'VIP' ? 'Cliente VIP - tratamento prioritário' : 'Cliente regular'}
` : '';

    // Build conversation history with context awareness
    const conversationHistorySection = conversationHistory.length > 0 ? `
HISTÓRICO DA LIGAÇÃO:
${conversationHistory.slice(-5).map((msg, index) => {
      const isRecent = index >= conversationHistory.length - 3;
      const prefix = isRecent ? '🔥 ' : '';
      return `${prefix}${msg.speaker === 'customer' ? 'Cliente' : 'Sofia'}: ${msg.content}`;
    }).join('\n')}
${conversationHistory.length > 5 ? '\n(Mostrando apenas as 5 mensagens mais recentes)' : ''}
` : '';

    // Instructions based on conversation state
    const conversationInstructions = hasStarted ? `
🔴 IMPORTANTE - CONVERSA JÁ EM ANDAMENTO:
- NÃO se reapresente (você já foi apresentada no início)
- NÃO repita "Olá, sou a Sofia" ou frases similares
- NÃO repita informações ou frases que já disse anteriormente
- CONTINUE naturalmente a conversa em andamento
- MANTENHA o contexto e fluxo natural da conversa
- EVITE voltar ao início ou repetir informações já fornecidas
- Responda diretamente à última mensagem do cliente

` : `
🟢 INÍCIO DA CONVERSA:
- Esta é sua primeira resposta após a apresentação inicial
- Responda diretamente à pergunta do cliente
- Seja acolhedora mas vá direto ao ponto
- Não repita a apresentação já feita

`;

    // Build the complete intelligent prompt
    const prompt = `
Você é Sofia, uma assistente virtual experiente e altamente empática que atende clientes por telefone. Sua personalidade é acolhedora, profissional e adaptável ao estado emocional do cliente.

${conversationInstructions}${storeInfoSection}${productInfoSection}${responseStyleSection}${customSection}${emotionalContextSection}${customerContextSection}${conversationHistorySection}

MENSAGEM ATUAL DO CLIENTE: "${customerMessage}"

INSTRUÇÕES AVANÇADAS PARA RESPOSTA DE VOZ:
- Adapte sua resposta ao tom emocional detectado
- Seja concisa mas completa (máximo 3-4 frases para situações complexas, 1-2 para simples)
- Use linguagem natural e conversacional adequada para fala
- Se o cliente estiver irritado, comece sempre validando o sentimento antes da solução
- Para clientes VIP, use tratamento mais personalizado
- Se detectar que o assunto é complexo, ofereça callback ou transferência para especialista

DETECÇÃO INTELIGENTE DE INTENÇÕES:
- Dúvidas sobre pedidos → Forneça informações específicas e oferece rastreamento
- Cancelamentos → Entenda o motivo primeiro, depois processe com empatia  
- Problemas de entrega → Seja proativa em oferecer soluções
- Alteração de dados → Confirme informações antes de processar
- Reclamações → Escute ativamente, valide sentimentos, foque na resolução

FORMATO DE RESPOSTA INTELIGENTE:
Responda APENAS com o texto natural que você falará para o cliente. Use tom adequado ao contexto emocional.

Para criar tickets automáticos, termine com: " [CRIAR_TICKET:categoria:prioridade]"
Categorias: duvidas, reclamacoes, alteracao_endereco, cancelamento, manual
Prioridades: baixa, media, alta, urgente

Exemplo: "Entendo sua frustração com o atraso na entrega. Vou resolver isso imediatamente para você. [CRIAR_TICKET:reclamacoes:alta]"
`;

    return prompt;
  }

  /**
   * Analyze voice emotional context for intelligent response adaptation
   */
  private analyzeVoiceEmotionalContext(customerMessage: string): {
    tone: string;
    urgency: string;
    intent: string;
    needsSpecialAttention: boolean;
  } {
    const msg = customerMessage.toLowerCase();
    
    // Tone analysis
    let tone = 'neutro';
    if (msg.includes('irritado') || msg.includes('raiva') || msg.includes('revoltado') || 
        msg.includes('absurdo') || msg.includes('inaceitável') || msg.includes('péssimo') ||
        msg.includes('horrível') || msg.includes('furioso')) {
      tone = 'irritado';
    } else if (msg.includes('frustrado') || msg.includes('desapontado') || msg.includes('chateado') ||
               msg.includes('decepcionado') || msg.includes('triste')) {
      tone = 'frustrado';
    } else if (msg.includes('preocupado') || msg.includes('ansioso') || msg.includes('nervoso') ||
               msg.includes('inquieto') || msg.includes('receoso')) {
      tone = 'preocupado';
    } else if (msg.includes('satisfeito') || msg.includes('contente') || msg.includes('feliz') ||
               msg.includes('grato') || msg.includes('obrigado')) {
      tone = 'positivo';
    }

    // Urgency analysis
    let urgency = 'baixa';
    if (msg.includes('urgente') || msg.includes('imediatamente') || msg.includes('agora mesmo') ||
        msg.includes('emergência') || msg.includes('preciso hoje') || msg.includes('já') ||
        msg.includes('rápido') || msg.includes('quanto antes')) {
      urgency = 'alta';
    } else if (msg.includes('logo') || msg.includes('breve') || msg.includes('em breve') ||
               msg.includes('quando possível') || msg.includes('assim que')) {
      urgency = 'média';
    }

    // Intent analysis  
    let intent = 'consulta_geral';
    if (msg.includes('cancelar') || msg.includes('cancelamento') || msg.includes('não quero mais') ||
        msg.includes('desistir') || msg.includes('estornar')) {
      intent = 'cancelamento';
    } else if (msg.includes('reclamação') || msg.includes('problema') || msg.includes('defeito') ||
               msg.includes('errado') || msg.includes('não funcionou') || msg.includes('ruim') ||
               msg.includes('péssimo') || msg.includes('insatisfeito')) {
      intent = 'reclamação';
    } else if (msg.includes('endereço') || msg.includes('mudança') || msg.includes('mudar') ||
               msg.includes('alterar') || msg.includes('correção') || msg.includes('corrigir')) {
      intent = 'alteracao_endereco';
    } else if (msg.includes('pedido') || msg.includes('compra') || msg.includes('produto') ||
               msg.includes('entrega') || msg.includes('chegou') || msg.includes('onde está')) {
      intent = 'consulta_pedido';
    } else if (msg.includes('dúvida') || msg.includes('pergunta') || msg.includes('como') ||
               msg.includes('quando') || msg.includes('informação')) {
      intent = 'duvida';
    }

    // Special attention analysis
    const needsSpecialAttention = (
      tone === 'irritado' || 
      urgency === 'alta' || 
      intent === 'reclamação' ||
      msg.includes('advogado') || msg.includes('procon') || msg.includes('processo') ||
      msg.includes('judicial') || msg.includes('consumidor') || msg.includes('denúncia')
    );

    return {
      tone,
      urgency,
      intent,
      needsSpecialAttention
    };
  }

  /**
   * Parse AI response for voice conversation
   */
  private parseAIVoiceResponse(aiResponse: string): {
    response: string;
    shouldCreateTicket: boolean;
    suggestedCategory?: string;
    priority?: string;
    detectedIntent?: string;
  } {
    // Check if AI wants to create a ticket with enhanced format [CRIAR_TICKET:categoria:prioridade]
    const ticketMatch = aiResponse.match(/\[CRIAR_TICKET:(\w+)(?::(\w+))?\]/);
    const shouldCreateTicket = !!ticketMatch;
    const suggestedCategory = ticketMatch?.[1] || undefined;
    const priority = ticketMatch?.[2] || 'media'; // Default to media priority
    
    // Clean response text
    const response = aiResponse.replace(/\[CRIAR_TICKET:\w+(?::\w+)?\]/, '').trim();
    
    // Enhanced intent detection based on keywords and context
    let detectedIntent = 'general_inquiry';
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('cancelar') || lowerResponse.includes('cancelamento') ||
        lowerResponse.includes('desistir') || lowerResponse.includes('não quero mais')) {
      detectedIntent = 'cancellation';
    } else if (lowerResponse.includes('endereço') || lowerResponse.includes('mudar') ||
               lowerResponse.includes('alterar dados') || lowerResponse.includes('correção')) {
      detectedIntent = 'address_change';
    } else if (lowerResponse.includes('problema') || lowerResponse.includes('reclamação') ||
               lowerResponse.includes('defeito') || lowerResponse.includes('insatisfeito')) {
      detectedIntent = 'complaint';
    } else if (lowerResponse.includes('pedido') || lowerResponse.includes('entrega') ||
               lowerResponse.includes('onde está') || lowerResponse.includes('rastrear')) {
      detectedIntent = 'order_inquiry';
    } else if (lowerResponse.includes('dúvida') || lowerResponse.includes('informação') ||
               lowerResponse.includes('como funciona') || lowerResponse.includes('prazo')) {
      detectedIntent = 'information_request';
    } else if (lowerResponse.includes('pagamento') || lowerResponse.includes('cobrança') ||
               lowerResponse.includes('valor') || lowerResponse.includes('preço')) {
      detectedIntent = 'billing_inquiry';
    }

    return {
      response,
      shouldCreateTicket,
      suggestedCategory,
      priority,
      detectedIntent,
    };
  }

  /**
   * Handle out of hours calls
   */
  private handleOutOfHours(reason: string, settings?: VoiceSettings): string {
    const message = settings?.outOfHoursMessage || 
      "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que retornaremos em breve.";
    
    const action = settings?.outOfHoursAction || 'voicemail';
    
    if (action === 'hangup') {
      return this.generateHangupCommand(message);
    }
    
    // Default to hangup (Telnyx doesn't support voicemail in the same way)
    return this.generateHangupCommand(message);
  }

  /**
   * Validate public URL configuration for media streams
   */
  private validatePublicUrlForMediaStream(): { isValid: boolean; domain?: string; error?: string } {
    const domain = process.env.REPLIT_DEV_DOMAIN;
    
    if (!domain) {
      const error = 'REPLIT_DEV_DOMAIN environment variable not set. This is required for Twilio media streams to function properly.';
      console.error(`❌ ${error}`);
      return { isValid: false, error };
    }
    
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      const error = 'Cannot use localhost URLs for Twilio media streams. The stream URLs must be publicly accessible for Twilio to connect.';
      console.error(`❌ ${error}`);
      return { isValid: false, error };
    }
    
    return { isValid: true, domain };
  }

  /**
   * Answer call using Telnyx REST API
   */
  private async answerCall(callControlId: string): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot answer call');
      throw new Error('Telnyx client not configured');
    }
    
    try {
      console.log(`📞 Answering call ${callControlId}`);
      // Use minimal payload - only client_state as base64 if needed
      const clientState = Buffer.from(JSON.stringify({ action: 'call_answered' })).toString('base64');
      await this.telnyxClient.calls.answer(callControlId, {
        client_state: clientState
      });
      console.log(`✅ Call ${callControlId} answered successfully`);
    } catch (error) {
      console.error(`❌ Error answering call ${callControlId}:`, error);
      // Enhanced error logging for debugging
      if (error && typeof error === 'object') {
        const telnyxError = error as any;
        console.error('🐛 Telnyx 422 details:', telnyxError.raw?.errors, telnyxError.responseBody, telnyxError.requestId);
      }
      throw error;
    }
  }

  /**
   * Hangup call using Telnyx REST API
   */
  private async hangupCall(callControlId: string, reason?: string): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot hangup call');
      return;
    }
    
    try {
      console.log(`📞 Hanging up call ${callControlId}: ${reason || 'No reason provided'}`);
      // Use empty payload for hangup - no parameters needed
      await this.telnyxClient.calls.hangup(callControlId, {});
      console.log(`✅ Call ${callControlId} hung up successfully`);
    } catch (error) {
      console.error(`❌ Error hanging up call ${callControlId}:`, error);
      // Enhanced error logging for debugging
      if (error && typeof error === 'object') {
        const telnyxError = error as any;
        console.error('🐛 Telnyx 422 details:', telnyxError.raw?.errors, telnyxError.responseBody, telnyxError.requestId);
      }
    }
  }

  /**
   * Start AI conversation with high-performance real-time transcription
   */
  private async startAIConversation(callControlId: string, operationId: string, callType: string = 'test'): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot start AI conversation');
      return;
    }
    
    try {
      console.log(`🚀 Starting high-performance AI conversation for call ${callControlId}`);
      console.log(`🎯 Using callType: ${callType} with real-time transcription`);
      
      // Start real-time transcription immediately for faster response
      await this.startWhisperTranscription(callControlId, operationId, callType);
      
      // Generate and speak welcome message while transcription runs in background
      const welcomeMessage = await this.generateTestCallWelcomeMessage(operationId, callType);
      
      console.log(`🗣️ Speaking welcome message: "${welcomeMessage}"`);
      const clientState = Buffer.from(JSON.stringify({ 
        action: 'speaking_welcome',
        operationId,
        callType
      })).toString('base64');
      
      // Guard: Check if call is still active before speaking
      if (!this.activeCallIds.has(callControlId)) {
        console.log(`⚠️ Call ${callControlId} ended, skipping speak command`);
        return;
      }
      
      try {
        await this.speakWithElevenLabs(callControlId, welcomeMessage, clientState);
      } catch (speakErr: any) {
        console.error(`❌ Error in speak call:`, speakErr);
        if (speakErr.raw?.errors) {
          console.error(`🔍 Telnyx speak error details:`, JSON.stringify(speakErr.raw.errors, null, 2));
        }
        throw speakErr;
      }
      
      // Initialize conversation context for this call
      this.conversationContext.set(callControlId, []);
      this.transcriptionActive.set(callControlId, true);
      
      console.log(`✅ High-performance conversation activated for call ${callControlId}`);
    } catch (error) {
      console.error(`❌ Error starting AI conversation for call ${callControlId}:`, error);
      await this.hangupCall(callControlId, 'Erro ao iniciar conversa com IA');
    }
  }

  /**
   * Start audio recording for OpenAI Whisper transcription
   * This provides automatic language detection and superior accuracy
   */
  private async startWhisperTranscription(callControlId: string, operationId?: string, callType?: string): Promise<void> {
    try {
      // Check if transcription is already active
      if (this.transcriptionActive.get(callControlId)) {
        console.log(`⚠️ Transcription already active for ${callControlId}`);
        return;
      }
      
      console.log(`🎤 Starting Whisper-based transcription with auto-language detection for call ${callControlId}`);
      
      const apiKey = process.env.TELNYX_API_KEY;
      if (!apiKey) {
        throw new Error('No Telnyx API key found');
      }

      // Start recording to capture audio for Whisper
      const response = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/record_start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'wav',
          channels: 'single',
          play_beep: false,
          include_silence: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to start recording for Whisper (${response.status}):`, errorText);
        throw new Error(`Recording start failed: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Recording started for Whisper transcription:`, result);
      
      // Mark transcription as active
      this.transcriptionActive.set(callControlId, true);
      this.transcriptionBuffer.set(callControlId, '');
      this.lastTranscriptionTime.set(callControlId, Date.now());
      
    } catch (error) {
      console.error(`❌ Error starting Whisper transcription:`, error);
      // Fallback to gather_using_ai if transcription fails
      console.log(`🔄 Falling back to gather_using_ai`);
      await this.startSpeechGather(callControlId, operationId || '', callType || 'test');
    }
  }

  /**
   * Generate humanized speech using ElevenLabs
   */
  private async generateElevenLabsSpeech(text: string, voiceId: string = ELEVENLABS_VOICE_ID): Promise<Buffer> {
    try {
      if (!ELEVENLABS_API_KEY) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log(`🎤 Generating ElevenLabs speech for: "${text.substring(0, 50)}..."`);

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.65,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ ElevenLabs speech generated: ${audioBuffer.length} bytes`);
      
      return audioBuffer;
    } catch (error) {
      console.error(`❌ Error generating ElevenLabs speech:`, error);
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper with automatic language detection
   */
  private async transcribeWithWhisper(audioBuffer: Buffer): Promise<{ text: string; language: string }> {
    try {
      console.log(`🎤 Transcribing audio with Whisper (${audioBuffer.length} bytes)`);

      // Create a proper File object for OpenAI SDK
      const audioFile = new File([audioBuffer], 'audio.wav', { 
        type: 'audio/wav',
        lastModified: Date.now()
      });

      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
        // Remove language parameter to enable automatic detection
      });

      const transcript = transcriptionResponse.text;
      const language = (transcriptionResponse as any).language || 'unknown';

      console.log(`✅ Whisper transcription complete:`);
      console.log(`   Text: "${transcript}"`);
      console.log(`   Language detected: ${language}`);

      return { text: transcript, language };
    } catch (error) {
      console.error(`❌ Error transcribing with Whisper:`, error);
      throw error;
    }
  }

  /**
   * Intelligent TTS provider selection with cost control
   */
  private async speakWithIntelligentTTS(
    callControlId: string, 
    text: string, 
    clientState?: string,
    isGreeting: boolean = false
  ): Promise<void> {
    try {
      // Guard: Check if call is still active before speaking
      if (!this.activeCallIds.has(callControlId)) {
        console.log(`⚠️ Call ${callControlId} ended, skipping speak command`);
        return;
      }

      // Intelligent provider selection
      const shouldUseElevenLabs = this.shouldUseElevenLabs(text, isGreeting);
      
      if (shouldUseElevenLabs) {
        console.log(`🎤 Using ElevenLabs for: "${text.substring(0, 50)}..."`);
        
        try {
          const audioBuffer = await this.generateElevenLabsSpeech(text);
          
          // Check if base64 would be too large for Telnyx (limit ~50KB base64 = ~37KB binary)
          if (audioBuffer.length <= 37000) {
            const audioBase64 = audioBuffer.toString('base64');
            const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

            await this.telnyxClient?.calls.playbackStart(callControlId, {
              audio_url: audioUrl,
              loop: 1,
              client_state: clientState || Buffer.from(JSON.stringify({
                action: 'elevenlabs_speech',
                timestamp: Date.now()
              })).toString('base64')
            });

            console.log(`✅ ElevenLabs audio played (${audioBuffer.length} bytes)`);
            return;
          } else {
            console.log(`⚠️ ElevenLabs audio too large (${audioBuffer.length} bytes), using Telnyx TTS`);
            // Fall through to Telnyx TTS
          }
        } catch (elevenLabsError) {
          console.log(`⚠️ ElevenLabs failed: ${elevenLabsError}, using Telnyx TTS`);
          // Fall through to Telnyx TTS
        }
      } else {
        console.log(`💰 Using economical Telnyx TTS for: "${text.substring(0, 50)}..."`);
      }
      
      // Use reliable Telnyx TTS (economical and always works)
      await this.telnyxClient?.calls.speak(callControlId, {
        payload: text,
        payload_type: 'text',
        service_level: 'premium',
        language: 'pt-BR',
        voice: 'Polly.Camila',
        client_state: clientState || Buffer.from(JSON.stringify({
          action: 'telnyx_speech',
          timestamp: Date.now()
        })).toString('base64')
      });
      
      console.log(`✅ Telnyx TTS completed for call ${callControlId}`);
    } catch (error) {
      console.error(`❌ Critical TTS error for call ${callControlId}:`, error);
      
      // Final emergency fallback
      try {
        await this.telnyxClient?.calls.speak(callControlId, {
          payload: "Desculpe, tivemos um problema técnico.",
          payload_type: 'text',
          service_level: 'basic',
          language: 'pt-BR',
          voice: 'Polly.Camila',
          client_state: clientState
        });
      } catch (finalError) {
        console.error(`❌ Even emergency fallback failed:`, finalError);
      }
    }
  }

  /**
   * Intelligent decision on whether to use ElevenLabs based on cost and context
   */
  private shouldUseElevenLabs(text: string, isGreeting: boolean): boolean {
    // Use ElevenLabs only for:
    // 1. Short greetings/critical messages (< 50 chars)
    // 2. Important first impressions
    // 3. VIP interactions (future enhancement)
    
    const textLength = text.length;
    
    // For greetings under 50 characters, use ElevenLabs for best first impression
    if (isGreeting && textLength <= 50) {
      console.log(`🌟 Using ElevenLabs for short greeting (${textLength} chars)`);
      return true;
    }
    
    // For very short responses (< 30 chars), occasionally use ElevenLabs
    if (textLength <= 30 && Math.random() < 0.3) {
      console.log(`🎯 Using ElevenLabs for short response (${textLength} chars)`);
      return true;
    }
    
    // Otherwise use economical Telnyx TTS
    console.log(`💰 Using Telnyx TTS for efficiency (${textLength} chars)`);
    return false;
  }

  /**
   * Handle out of hours calls using Telnyx REST API
   */
  private async handleOutOfHoursCall(callControlId: string, reason: string, settings?: VoiceSettings): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot handle out of hours');
      return;
    }
    
    try {
      // Answer first
      await this.answerCall(callControlId);
      
      // Get out of hours message
      const message = settings?.outOfHoursMessage || 
        'Desculpe, nosso atendimento está fechado no momento. Nosso horário de funcionamento é de segunda a sexta, das 9h às 18h.';
      
      // Speak the message with ElevenLabs
      const clientState = Buffer.from(JSON.stringify({ action: 'speaking_out_of_hours' })).toString('base64');
      await this.speakWithElevenLabs(callControlId, message, clientState);
      
      // Wait a bit then hangup
      setTimeout(() => {
        this.hangupCall(callControlId, 'Out of hours');
      }, 3000);
      
      console.log(`🕐 Out of hours message sent to call ${callControlId}`);
    } catch (error) {
      console.error(`❌ Error handling out of hours call ${callControlId}:`, error);
      await this.hangupCall(callControlId, 'Erro no tratamento fora de horário');
    }
  }

  /**
   * Start media streaming for bidirectional conversation
   */
  private async startMediaStreaming(callControlId: string, operationId: string, callType: string): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot start media streaming');
      return;
    }
    
    try {
      console.log(`🎵 Starting media streaming for call ${callControlId}`);
      
      // DEPRECATED: Media streaming replaced by gather_using_speech
      console.log(`⚠️ Media streaming deprecated - redirecting to speech recognition`);
      await this.startSpeechGather(callControlId, operationId, callType);
      return;
      
      console.log(`✅ Media streaming activated for call ${callControlId}`);
      
    } catch (error) {
      console.error(`❌ Error starting media streaming for call ${callControlId}:`, error);
      
      // Fallback: Continue with voice prompts
      console.log(`🔄 Falling back to prompt-based conversation`);
      await this.startPromptBasedConversation(callControlId, operationId, callType);
    }
  }

  /**
   * Start AI-powered speech collection using Telnyx HTTP API (gather_using_ai)
   */
  private async startSpeechGather(callControlId: string, operationId: string, callType: string, messageHistory: any[] = []): Promise<void> {
    // Check if call is still active
    if (!this.activeCallIds.has(callControlId)) {
      console.log(`⚠️ Call ${callControlId} is no longer active, skipping speech gather`);
      return;
    }
    
    try {
      console.log(`🎤 Starting AI speech collection via HTTP API for call ${callControlId}`);
      
      const apiKey = process.env.TELNYX_API_KEY;
      if (!apiKey) {
        console.error(`❌ No Telnyx API key found`);
        await this.startPromptBasedConversation(callControlId, operationId, callType);
        return;
      }
      
      // Get existing conversation history if available, otherwise use the passed messageHistory
      const existingHistory = this.conversationContext.get(callControlId) || [];
      if (existingHistory.length > 0) {
        messageHistory = existingHistory;
        console.log(`📚 Using existing conversation history with ${messageHistory.length} messages`);
      }
      
      // Get the proper greeting message if this is the first interaction
      let greeting: string;
      if (messageHistory.length > 0) {
        greeting = "Continue falando, estou ouvindo...";
      } else {
        greeting = await this.generateTestCallWelcomeMessage(operationId, callType);
        console.log(`🎯 Using personalized greeting: "${greeting}"`);
      }

      // Direct HTTP call to Telnyx gather_using_ai API
      const response = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          greeting,
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "A mensagem do cliente em português brasileiro"
              },
              intent: {
                type: "string", 
                description: "A intenção do cliente: produto, preço, dúvida, reclamação"
              }
            },
            required: ["message"]
          },
          voice: "Polly.Camila",
          language: "pt-BR",
          transcription: {
            provider: "google",
            language: "pt-BR", 
            model: "latest_long"
          },
          speech: {
            provider: "google",
            language: "pt-BR",
            voice: "pt-BR-Neural2-B"
          },
          hints: ["Lucas", "Lucca", "Sofia", "com o Lucas", "com Lucas", "aqui é o Lucas", "eu sou o Lucas", "meu nome é Lucas", "obrigado", "tchau", "oi", "olá", "bom dia", "boa tarde", "sim", "não", "quero falar com"],
          interruption: { enabled: true },
          send_partial_results: false,
          user_response_timeout: 30000,  // Increase timeout to 30 seconds
          llm_model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          llm_temperature: 0.7,
          llm_max_tokens: 256,
          message_history: messageHistory,
          client_state: Buffer.from(JSON.stringify({
            action: 'ai_voice_input',
            operationId,
            callType,
            timestamp: Date.now()
          })).toString('base64')
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`🤖 AI voice collection initiated successfully:`, result);
      } else {
        const errorText = await response.text();
        console.error(`❌ HTTP API Error (${response.status}):`, errorText);
        console.error(`❌ Request payload was:`, JSON.stringify({
          greeting,
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "O que o cliente está falando ou perguntando"
              },
              intent: {
                type: "string", 
                description: "A intenção do cliente: produto, preço, dúvida, reclamação, etc."
              }
            },
            required: ["message"]
          },
          voice: "Polly.Camila",
          language: "pt-BR",
          transcription: {
            provider: "google",
            language: "pt-BR", 
            model: "latest_long"
          },
          speech: {
            provider: "google",
            language: "pt-BR",
            voice: "pt-BR-Neural2-B"
          },
          hints: ["Lucas", "Lucca", "Sofia", "com o Lucas", "com Lucas", "aqui é o Lucas", "eu sou o Lucas", "meu nome é Lucas", "obrigado", "tchau", "oi", "olá", "bom dia", "boa tarde", "sim", "não", "quero falar com"],
          interruption: { enabled: true },
          send_partial_results: false,
          user_response_timeout: 30000,  // Increase timeout to 30 seconds
          llm_model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          llm_temperature: 0.7,
          llm_max_tokens: 256,
          message_history: messageHistory,
          client_state: Buffer.from(JSON.stringify({
            action: 'ai_voice_input',
            operationId,
            callType,
            timestamp: Date.now()
          })).toString('base64')
        }, null, 2));
        
        // Parse error to understand what's wrong
        try {
          const errorObj = JSON.parse(errorText);
          console.error(`❌ Telnyx API Error Details:`, errorObj);
        } catch (e) {
          console.error(`❌ Raw error text:`, errorText);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error(`❌ Error starting AI speech collection:`, error);
      
      // Fallback to DTMF if AI speech fails
      await this.startPromptBasedConversation(callControlId, operationId, callType);
    }
  }

  /**
   * SIMPLIFIED WORKING voice conversation system (DTMF fallback)
   */
  private async startPromptBasedConversation(callControlId: string, operationId: string, callType: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    // Check if call is still active
    if (!this.activeCallIds.has(callControlId)) {
      console.log(`⚠️ Call ${callControlId} is no longer active, skipping DTMF conversation`);
      return;
    }
    
    try {
      console.log(`🎙️ Starting conversation for call ${callControlId}`);
      
      // Use gather with ALL required parameters
      await this.telnyxClient.calls.gather(callControlId, {
        minimum_digits: 1,
        maximum_digits: 1,
        timeout_millis: 15000,
        inter_digit_timeout_millis: 2000,
        initial_timeout_millis: 5000,
        terminating_digit: '#',
        valid_digits: '0123456789*#',
        client_state: Buffer.from(JSON.stringify({
          action: 'user_input',
          operationId,
          callType,
          timestamp: Date.now()
        })).toString('base64')
      });

      console.log(`🎤 DTMF input gathering active for ${callControlId}`);
      
    } catch (error) {
      console.error(`❌ Error starting conversation:`, error);
      
      // Even simpler fallback - just speak and wait
      await this.telnyxClient.calls.speak(callControlId, {
        payload: "Por favor, pressione qualquer tecla para continuar.",
        payload_type: 'text',
        service_level: 'basic',
        voice: 'Telnyx.KokoroTTS.af'
      });
    }
  }

  /**
   * Handle speech gather ended - process user speech and respond
   */
  async handleSpeechGatherEnded(callData: any, callType: string, operationId: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    try {
      console.log(`🎤 Processing input for call ${callData.call_control_id}`);
      console.log(`📝 Gather status: ${callData.status}`);
      console.log(`🗣️ Speech result: "${callData.speech || 'none'}"`);
      console.log(`🔢 Digits result: "${callData.digits || 'none'}"`);
      
      // Check client state to determine if this is voice or DTMF
      const clientState = callData.client_state;
      let decodedState = null;
      
      if (clientState) {
        try {
          decodedState = JSON.parse(Buffer.from(clientState, 'base64').toString());
        } catch (e) {
          console.warn('⚠️ Could not decode client_state:', e);
        }
      }
      
      const isVoiceInput = decodedState?.action === 'ai_voice_input';
      
      // Process AI voice input (gather_using_ai results)
      if (callData.status === 'valid' && callData.parameters && isVoiceInput) {
        const aiResults = callData.parameters;
        const userMessage = aiResults.message;
        console.log(`✅ AI understood: "${userMessage}"`);
        console.log(`🎯 AI detected intent: "${aiResults.intent || 'general'}"`);
        
        // Generate AI response based on what the user said
        const aiResponse = await this.generateConversationalResponse(userMessage, operationId, callType);
        console.log(`🤖 AI Response: "${aiResponse}"`);
        
        // Speak the response
        try {
          await this.telnyxClient.calls.speak(callData.call_control_id, {
            payload: aiResponse,
            payload_type: 'text',
            service_level: 'basic',
            voice: 'Polly.Camila',
            client_state: Buffer.from(JSON.stringify({
              action: 'speaking_ai_response'
            })).toString('base64')
          });
          console.log(`🎙️ AI response sent successfully`);
        } catch (speakError) {
          console.error('❌ Speak error:', speakError);
        }
        
        // Continue voice recognition after response
        setTimeout(async () => {
          console.log(`🔄 Continuing AI voice conversation...`);
          await this.startSpeechGather(callData.call_control_id, operationId, callType);
        }, 3000);
        
      } 
      // Process DTMF input
      else if (callData.status === 'valid' && callData.digits && !isVoiceInput) {
        const userInput = callData.digits;
        console.log(`✅ User pressed: "${userInput}"`);
        
        // Generate AI response based on the digit pressed
        const aiResponse = await this.generateSimpleResponse(userInput, operationId, callType);
        console.log(`🤖 AI Response: "${aiResponse}"`);
        
        // Speak the response
        try {
          await this.telnyxClient.calls.speak(callData.call_control_id, {
            payload: aiResponse,
            payload_type: 'text',
            service_level: 'basic',
            voice: 'Polly.Camila'
          });
          console.log(`🎙️ Response sent successfully`);
        } catch (speakError) {
          console.error('❌ Speak error:', speakError);
        }
        
        // Continue with voice recognition (upgrade from DTMF)
        setTimeout(async () => {
          console.log(`🔄 Upgrading to voice conversation...`);
          await this.startSpeechGather(callData.call_control_id, operationId, callType);
        }, 3000);
        
      } 
      // Handle timeouts
      else if (callData.status === 'timeout') {
        console.log(`⏰ No AI input received - restarting voice collection`);
        
        // Restart AI voice collection with new greeting
        setTimeout(async () => {
          console.log(`🔄 Restarting AI voice collection...`);
          await this.startSpeechGather(callData.call_control_id, operationId, callType);
        }, 2000);
        
      } else {
        console.log(`❌ Invalid input or call hangup - ending conversation`);
        await this.endCallGracefully(callData.call_control_id);
      }
      
    } catch (error) {
      console.error('Error handling gather ended:', error);
      try {
        await this.endCallGracefully(callData.call_control_id);
      } catch (e) {
        console.error('Error ending call gracefully:', e);
      }
    }
  }

  /**
   * Generate conversational AI response based on user speech
   */
  private async generateConversationalResponse(userSpeech: string, operationId: string, callType: string): Promise<string> {
    try {
      console.log(`🤖 Generating conversational response for: "${userSpeech}"`);
      
      // Get active AI directives for this operation
      const directives = await this.getActiveDirectives(operationId);
      console.log(`📄 Found ${directives.length} AI directives for voice response`);
      
      // Build voice-specific prompt using directives
      const prompt = await this.buildVoiceCallPrompt(operationId, userSpeech, directives, callType as 'test' | 'sales');
      
      // Get OpenAI from container and generate response
      const openai = container.resolve('openai') as any;
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 300
      });
      
      const aiResponse = response.choices[0].message.content || 'Desculpe, não entendi. Pode repetir?';
      console.log(`🎯 AI generated response with directives: "${aiResponse}"`);
      return aiResponse;
      
    } catch (error) {
      console.error('❌ Error generating conversational response:', error);
      
      // Fallback responses based on keywords
      const lowerSpeech = userSpeech.toLowerCase();
      
      if (lowerSpeech.includes('oi') || lowerSpeech.includes('olá') || lowerSpeech.includes('alô')) {
        return 'Olá! Como posso ajudar você hoje?';
      }
      
      if (lowerSpeech.includes('produto') || lowerSpeech.includes('comprar')) {
        return 'Temos ótimos produtos disponíveis! Gostaria que eu conte mais sobre eles?';
      }
      
      if (lowerSpeech.includes('preço') || lowerSpeech.includes('valor') || lowerSpeech.includes('custa')) {
        return 'Nossos preços são muito competitivos! Posso passar mais detalhes para você.';
      }
      
      if (lowerSpeech.includes('entrega') || lowerSpeech.includes('entregar')) {
        return 'Fazemos entrega em todo o Brasil! A entrega é rápida e segura.';
      }
      
      // Default conversational response
      return 'Entendi! Pode me contar mais detalhes? Estou aqui para te ajudar da melhor forma possível.';
    }
  }

  /**
   * Generate simple response based on digit input
   */
  private async generateSimpleResponse(userInput: string, operationId: string, callType: string): Promise<string> {
    try {
      // Handle digit input with contextual responses
      const digitResponses = {
        '1': 'Perfeito! Você pressionou 1. Como posso ajudá-lo hoje?',
        '2': 'Ótimo! Você escolheu a opção 2. Em que posso ser útil?',
        '3': 'Entendi! Opção 3 selecionada. Pode me contar mais?',
        '0': 'Você pressionou 0. Gostaria de falar com um atendente?',
        '*': 'Obrigada! Estou aqui para ajudar. O que precisa?',
        '#': 'Perfeito! Como posso ajudá-lo especificamente?',
        '4': 'Opção 4 selecionada. Vamos continuar nossa conversa!',
        '5': 'Você pressionou 5. Estou ouvindo!',
        '6': 'Opção 6! Como posso ser útil?',
        '7': 'Você escolheu 7. Pode me falar o que precisa?',
        '8': 'Opção 8! Estou aqui para ajudar.',
        '9': 'Você pressionou 9. O que gostaria de saber?'
      };
      
      return digitResponses[userInput] || `Você pressionou ${userInput}. Como posso ajudá-lo?`;
    } catch (error) {
      console.error('Error generating simple response:', error);
      return 'Desculpe, tive um problema. Pode tentar novamente?';
    }
  }

  /**
   * Prompt user to speak
   */
  private async promptForSpeech(callControlId: string, operationId: string, callType: string): Promise<void> {
    try {
      await this.telnyxClient.calls.speak(callControlId, {
        payload: "Não consegui entender. Por favor, fale claramente ou pressione uma tecla.",
        payload_type: 'text',
        service_level: 'basic',
        voice: 'female'
      });

      setTimeout(async () => {
        await this.startPromptBasedConversation(callControlId, operationId, callType);
      }, 3000);

    } catch (error) {
      console.error('Error prompting for speech:', error);
    }
  }

  /**
   * End call gracefully with a polite message
   */
  private async endCallGracefully(callControlId: string): Promise<void> {
    try {
      await this.telnyxClient.calls.speak(callControlId, {
        payload: "Obrigada por entrar em contato! Tenha um ótimo dia!",
        payload_type: 'text',
        service_level: 'basic',
        voice: 'female'
      });

      setTimeout(async () => {
        await this.hangupCall(callControlId, 'Conversa finalizada');
      }, 3000);

    } catch (error) {
      console.error('Error ending call gracefully:', error);
      try {
        await this.hangupCall(callControlId, 'Erro ao finalizar');
      } catch (hangupError) {
        console.error('Error hanging up call:', hangupError);
      }
    }
  }

  /**
   * Handle transcription results from continuous recording
   */
  async handleTranscription(callData: any, callType: string, operationId: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    try {
      const transcriptionText = callData.transcription_text?.trim();
      
      if (transcriptionText && transcriptionText.length > 3) {
        console.log(`📝 Processing transcription: "${transcriptionText}"`);
        
        // Generate AI response based on transcription
        const aiResponse = await this.generateTestCallResponse(operationId, transcriptionText, callType);
        console.log(`🤖 Transcription AI Response: "${aiResponse}"`);
        
        // Speak the response
        await this.telnyxClient.calls.speak(callData.call_control_id, {
          payload: aiResponse,
          payload_type: 'text',
          service_level: 'basic',
          voice: 'Polly.Camila'
        });
        
        console.log(`🎙️ Transcription response sent successfully`);
      }
      
    } catch (error) {
      console.error('Error handling transcription:', error);
    }
  }

  /**
   * Generate TwiML for voicemail
   */
  private generateVoicemailTwiML(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${message}</Say>
    <Record maxLength="60" timeout="5" transcribe="true" transcribeCallback="/api/voice/transcription" />
    <Say voice="Polly.Camila-Neural" language="pt-BR">Obrigada pela sua mensagem. Entraremos em contato em breve.</Say>
    <Hangup />
</Response>`;
  }

  /**
   * Normalize phone number for consistent storage
   */
  /**
   * Generate welcome message for test calls based on AI directives
   */
  async generateTestCallWelcomeMessage(operationId: string, callType: 'test' | 'sales' = 'test'): Promise<string> {
    try {
      console.log(`🎯 Generating welcome message for operation ${operationId}, type: ${callType}`);
      
      // Get active AI directives for the operation
      const directives = await this.getActiveDirectives(operationId);
      console.log(`📋 Found ${directives.length} directives for operation ${operationId}`);
      
      // Build welcome message based on directives
      const storeInfoDirectives = directives.filter(d => d.type === 'store_info');
      const responseStyleDirectives = directives.filter(d => d.type === 'response_style');
      
      // Group directives by type for easier access
      const directivesByType = directives.reduce((acc, directive: any) => {
        if (!acc[directive.type]) acc[directive.type] = [];
        acc[directive.type].push(directive);
        return acc;
      }, {} as Record<string, any[]>);
      
      // For sales calls, use a more natural greeting asking for the person's name
      let welcomeMessage = "";
      
      if (callType === 'sales') {
        // Natural sales greeting - ask for the person's name first
        welcomeMessage = "Oi, aqui é a Sofia. ";
        
        // Add store name if available
        const storeNameDirective = storeInfoDirectives.find(d => 
          d.title?.toLowerCase().includes('nome') || 
          d.title?.toLowerCase().includes('empresa') ||
          d.content?.toLowerCase().includes('empresa')
        );
        
        if (storeNameDirective) {
          welcomeMessage += `Eu trabalho com a ${storeNameDirective.content}. `;
          console.log(`🏪 Added store name: ${storeNameDirective.content}`);
        }
        
        // Ask for the person's name naturally
        welcomeMessage += "Eu posso falar com quem, por favor?";
        
        // Note: After getting the name, Sofia will continue the conversation naturally
        console.log(`💼 Sales welcome message generated for ${operationId}`);
      } else {
        welcomeMessage += ". Esta é uma ligação de teste para demonstrar nosso sistema de atendimento automatizado.";
        console.log(`🧪 Test welcome message generated for ${operationId}`);
      }
      
      console.log(`✅ Final welcome message: "${welcomeMessage}"`);
      return welcomeMessage;
    } catch (error) {
      console.error('❌ Error generating test call welcome message:', error);
      const fallbackMessage = "Olá! Aqui é a Sofia, sua assistente virtual. Esta é uma ligação de teste do nosso sistema de atendimento.";
      console.log(`🔄 Using fallback message: "${fallbackMessage}"`);
      return fallbackMessage;
    }
  }

  /**
   * Generate AI response for test calls (reuses existing logic but adapted for voice)
   */
  async generateTestCallResponse(operationId: string, customerMessage: string, callType: 'test' | 'sales' = 'test'): Promise<string> {
    try {
      console.log(`🎯 Generating voice response for operation ${operationId}, type: ${callType}, message: "${customerMessage}"`);
      
      // Get active AI directives for the operation
      const directives = await this.getActiveDirectives(operationId);
      console.log(`📋 Found ${directives.length} directives for response generation`);
      
      // Build prompt specifically for voice conversation
      const prompt = await this.buildTestCallPrompt(operationId, customerMessage, directives, callType);
      console.log(`📝 Built prompt for OpenAI (length: ${prompt.length} chars)`);
      
      // Call OpenAI for response
      console.log(`🤖 Calling OpenAI GPT-4 for voice response...`);
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150, // Shorter for voice
      });

      const aiResponse = response.choices[0]?.message?.content?.trim() || 
        "Entendo sua solicitação. Posso ajudá-lo com mais alguma informação?";
      
      console.log(`✅ OpenAI response received: "${aiResponse}"`);
      console.log(`🎭 Response type: ${callType}, Language check: ${aiResponse.includes('ã') || aiResponse.includes('ç') ? 'Portuguese' : 'Possible English'}`);
      
      return aiResponse;
    } catch (error) {
      console.error('❌ Error generating test call response:', error);
      const fallbackResponse = "Obrigada por entrar em contato. Nossa equipe entrará em contato em breve.";
      console.log(`🔄 Using fallback response: "${fallbackResponse}"`);
      return fallbackResponse;
    }
  }

  /**
   * Build AI prompt specifically for test call responses
   */
  private async buildVoiceCallPrompt(
    operationId: string, 
    customerMessage: string, 
    directives: any[],
    callType: 'test' | 'sales' = 'test'
  ): Promise<string> {
    return this.buildTestCallPrompt(operationId, customerMessage, directives, callType);
  }

  private async buildTestCallPrompt(
    operationId: string, 
    customerMessage: string, 
    directives: any[],
    callType: 'test' | 'sales' = 'test'
  ): Promise<string> {
    // Group directives by type
    const directivesByType = directives.reduce((acc, directive: any) => {
      if (!acc[directive.type]) acc[directive.type] = [];
      acc[directive.type].push(directive);
      return acc;
    }, {} as Record<string, any[]>);

    // Build context sections
    const storeInfoSection = directivesByType.store_info?.length > 0 
      ? `INFORMAÇÕES DA EMPRESA:\n${directivesByType.store_info.map((d: any) => `- ${d.content}`).join('\n')}\n\n`
      : '';

    const productInfoSection = directivesByType.product_info?.length > 0 
      ? `PRODUTOS E SERVIÇOS:\n${directivesByType.product_info.map((d: any) => `- ${d.content}`).join('\n')}\n\n`
      : '';

    const responseStyleSection = directivesByType.response_style?.length > 0 
      ? `ESTILO DE ATENDIMENTO:\n${directivesByType.response_style.map((d: any) => `- ${d.content}`).join('\n')}\n\n`
      : '';

    const customSection = directivesByType.custom?.length > 0 
      ? `INSTRUÇÕES ESPECÍFICAS:\n${directivesByType.custom.map((d: any) => `- ${d.title}: ${d.content}`).join('\n')}\n\n`
      : '';

    // Define different contexts based on call type
    const contextSection = callType === 'sales' 
      ? `CONTEXTO DA LIGAÇÃO:
Esta é uma ligação de contato comercial/vendas para um potencial cliente. Seu objetivo é:
- Apresentar os produtos/serviços da empresa de forma atrativa
- Identificar necessidades do cliente e demonstrar como podemos ajudar
- Despertar interesse e conduzir à conversão/venda
- Ser persuasiva mas nunca insistente ou agressiva
- Focar nos benefícios e diferenciais competitivos

O cliente disse: "${customerMessage}"`
      : `CONTEXTO DA LIGAÇÃO:
Esta é uma ligação de teste do sistema de atendimento automatizado para demonstrar as capacidades da IA.

O cliente disse: "${customerMessage}"`;

    const instructionsSection = callType === 'sales'
      ? `INSTRUÇÕES PARA RESPOSTA DE VENDAS:
- Se o cliente falar o nome, cumprimente de forma personalizada: "Prazer em falar com você, [Nome]!"
- Seja calorosa, confiante e profissional desde o primeiro contato
- Use linguagem natural e pessoal, adequada para conversa telefônica
- Use as DIRETRIZES DE ATENDIMENTO PERSONALIZADAS se disponíveis
- Identifique dores/necessidades do cliente e apresente soluções baseadas nas INFORMAÇÕES DOS PRODUTOS
- Destaque benefícios únicos usando as INFORMAÇÕES DA EMPRESA
- Crie senso de urgência quando apropriado baseado nas INSTRUÇÕES ESPECÍFICAS
- Mantenha a resposta focada mas completa (máximo 3-4 frases)
- Se o cliente demonstrar interesse, seja mais específica sobre produtos/preços
- Se houver objeções, responda com empatia e apresente contrapontos`
      : `INSTRUÇÕES PARA RESPOSTA:
- Seja natural e conversacional, como se estivesse falando ao telefone
- Use linguagem clara e objetiva adequada para fala
- Seja empática e prestativa
- Mantenha a resposta concisa (máximo 2-3 frases)
- Aplique as instruções personalizadas da empresa
- Se apropriado, ofereça ajuda adicional ou próximos passos`;

    const prompt = `Você é Sofia, uma assistente virtual empática e profissional que atende clientes por telefone.

${storeInfoSection}${productInfoSection}${responseStyleSection}${customSection}

${contextSection}

${instructionsSection}

Responda apenas com o texto que você falará para o cliente:`;

    return prompt;
  }

  public normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }

  /**
   * Process real-time transcription data with intelligent debouncing
   * This method is called by webhook when transcription data arrives
   */
  async processTranscription(callControlId: string, transcript: string, isFinal: boolean): Promise<void> {
    try {
      // Check if transcription is active for this call
      if (!this.transcriptionActive.get(callControlId)) {
        console.log(`⚠️ Transcription not active for call ${callControlId}`);
        return;
      }

      // BARGE-IN: Check if Sofia is currently speaking
      const isSofiaSpeaking = this.isSofiaSpeaking?.get?.(callControlId) || false;
      if (isSofiaSpeaking && transcript.trim().length > 0) {
        console.log(`🎤 User interrupted Sofia! Stopping her speech...`);
        
        // Stop Sofia's current speech immediately
        try {
          await this.telnyxClient?.calls.stopSpeaking(callControlId);
          this.isSofiaSpeaking?.set?.(callControlId, false);
          console.log(`✔️ Sofia stopped speaking, now listening to user`);
        } catch (error) {
          console.log(`⚠️ Could not stop Sofia's speech:`, error);
        }
      }

      // Add to buffer
      const currentBuffer = this.transcriptionBuffer.get(callControlId) || '';
      const newBuffer = currentBuffer + ' ' + transcript;
      this.transcriptionBuffer.set(callControlId, newBuffer.trim());
      
      console.log(`📝 Transcription buffer: "${newBuffer}" (Final: ${isFinal})`);
      
      // Update last transcription time for silence detection
      this.lastTranscriptionTime.set(callControlId, Date.now());
      
      // Clear any existing timeout
      const existingTimeout = this.processingTimeouts.get(callControlId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Set a new timeout to process after user stops speaking (1.5 seconds of silence)
      const timeout = setTimeout(() => {
        const messageToProcess = this.transcriptionBuffer.get(callControlId)?.trim();
        if (messageToProcess && messageToProcess.length > 0 && !this.isProcessingResponse.get(callControlId)) {
          console.log(`⏱️ Silence detected, processing: "${messageToProcess}"`);
          this.transcriptionBuffer.set(callControlId, '');
          this.processUserMessage(callControlId, messageToProcess);
        }
      }, 1500); // Wait 1.5 seconds of silence before processing
      
      this.processingTimeouts.set(callControlId, timeout);
      
      // Process immediately if it's final or we have a clear complete sentence
      if (isFinal || (newBuffer.endsWith('?') || newBuffer.endsWith('.') || newBuffer.endsWith('!'))) {
        clearTimeout(timeout);
        this.processingTimeouts.delete(callControlId);
        
        if (!this.isProcessingResponse.get(callControlId) && newBuffer.trim().length > 0) {
          const messageToProcess = newBuffer.trim();
          this.transcriptionBuffer.set(callControlId, '');
          console.log(`🚀 Processing complete sentence: "${messageToProcess}"`);
          this.processUserMessage(callControlId, messageToProcess);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing transcription:`, error);
    }
  }

  /**
   * High-speed message processing with AI and immediate response
   */
  private async processUserMessage(callControlId: string, userMessage: string): Promise<void> {
    try {
      // Skip processing very short or empty messages
      if (!userMessage || userMessage.trim().length < 2) {
        console.log(`⚠️ Skipping very short message: "${userMessage}"`);
        this.isProcessingResponse.set(callControlId, false);
        return;
      }
      
      // Mark as processing
      this.isProcessingResponse.set(callControlId, true);
      
      // Get call info from database
      const [call] = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.telnyxCallControlId, callControlId))
        .limit(1);
      
      if (!call) {
        console.error(`❌ Call not found for ${callControlId}`);
        this.isProcessingResponse.set(callControlId, false);
        return;
      }
      
      // Get conversation history
      const history = this.conversationContext.get(callControlId) || [];
      const hasStarted = this.conversationStarted.get(callControlId) || false;
      
      // Mark conversation as started
      if (!hasStarted) {
        this.conversationStarted.set(callControlId, true);
      }
      
      // Generate AI response quickly with context
      const startTime = Date.now();
      const aiResult = await this.processConversationWithAI(callControlId, userMessage, history, hasStarted);
      const responseTime = Date.now() - startTime;
      
      console.log(`⚡ AI response generated in ${responseTime}ms: "${aiResult?.response}"`);
      
      if (!aiResult?.response) {
        console.error(`❌ No AI response generated`);
        this.isProcessingResponse.set(callControlId, false);
        return;
      }
      
      // Stop transcription temporarily while speaking
      await this.pauseTranscription(callControlId);
      
      // Mark Sofia as speaking
      this.isSofiaSpeaking.set(callControlId, true);
      
      // Speak response immediately with ElevenLabs
      const responseClientState = Buffer.from(JSON.stringify({
        action: 'speaking_response',
        operationId: call.operationId,
        timestamp: Date.now()
      })).toString('base64');
      
      await this.speakWithElevenLabs(callControlId, aiResult.response, responseClientState);
      
      // Update conversation history
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResult.response }
      );
      this.conversationContext.set(callControlId, history);
      
      // Mark processing complete
      this.isProcessingResponse.set(callControlId, false);
      
    } catch (error) {
      console.error(`❌ Error processing user message:`, error);
      this.isProcessingResponse.set(callControlId, false);
    }
  }

  /**
   * Pause transcription while Sofia is speaking
   */
  private async pauseTranscription(callControlId: string): Promise<void> {
    try {
      const apiKey = process.env.TELNYX_API_KEY;
      if (!apiKey) return;
      
      await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/transcription_stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`⏸️ Transcription paused for ${callControlId}`);
    } catch (error) {
      console.error(`❌ Error pausing transcription:`, error);
    }
  }

  /**
   * Resume transcription after Sofia finishes speaking
   */
  async resumeTranscription(callControlId: string): Promise<void> {
    try {
      // Re-start transcription
      await this.startRealTimeTranscription(callControlId);
      console.log(`▶️ Transcription resumed for ${callControlId}`);
    } catch (error) {
      console.error(`❌ Error resuming transcription:`, error);
    }
  }

  /**
   * Handle AI gather ended - process user response and continue conversation
   */
  async handleAiGatherEnded(callData: any, callType: string, operationId: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    try {
      const callControlId = callData.call_control_id;
      const messageHistory = callData.message_history || [];
      
      // Debug: Log the complete result structure
      console.log(`📄 AI gather result structure:`, JSON.stringify(callData.result, null, 2));
      console.log(`📄 Message history:`, JSON.stringify(messageHistory, null, 2));
      
      // Get user response from the result.parameters.message field (this is what the AI extracted)
      let userResponse = '';
      if (callData.result?.parameters?.message) {
        userResponse = callData.result.parameters.message;
        console.log(`✅ Got user response from result.parameters.message: "${userResponse}"`);
      } else if (messageHistory.length > 0) {
        // Fallback: Find the last user message in history
        for (let i = messageHistory.length - 1; i >= 0; i--) {
          if (messageHistory[i].role === 'user') {
            userResponse = messageHistory[i].content;
            console.log(`✅ Got user response from message history: "${userResponse}"`);
            break;
          }
        }
      }
      
      // Last resort fallbacks
      if (!userResponse) {
        userResponse = callData.transcript || callData.speech_result || '';
        console.log(`⚠️ Using fallback response: "${userResponse}"`);
      }
      
      console.log(`🤖 Processing AI gather for call ${callControlId}`);
      console.log(`👤 User said: "${userResponse}"`);
      
      if (!userResponse || userResponse.trim().length === 0) {
        console.log(`⚠️ No user response - ending conversation`);
        await this.telnyxClient.calls.hangup(callControlId);
        return;
      }

      // Generate AI response using existing method
      console.log(`🎯 Generating AI response for operationId: ${operationId}`);
      const aiResult = await this.processConversationWithAI(callControlId, userResponse, messageHistory);
      
      if (!aiResult?.response) {
        console.log(`❌ Failed to generate AI response - ending conversation`);
        await this.telnyxClient.calls.hangup(callControlId);
        return;
      }

      console.log(`🤖 Sofia will respond: "${aiResult.response}"`);
      
      // Update conversation context with the new exchange
      const updatedHistory = [
        ...messageHistory,
        { role: 'user', content: userResponse },
        { role: 'assistant', content: aiResult.response }
      ];
      this.conversationContext.set(callControlId, updatedHistory);
      console.log(`📚 Updated conversation history: ${updatedHistory.length} messages`);

      // Guard: Check if call is still active before speaking
      if (!this.activeCallIds.has(callControlId)) {
        console.log(`⚠️ Call ${callControlId} ended, skipping speak command`);
        return;
      }
      
      // Speak the AI response - using premium for Portuguese
      await this.telnyxClient.calls.speak(callControlId, {
        payload: aiResult.response,
        payload_type: 'text',
        service_level: 'premium',  // Must use premium for pt-BR
        language: 'pt-BR',
        voice: 'Polly.Camila',
        client_state: Buffer.from(JSON.stringify({
          action: 'speaking_response',
          operationId,
          callType,
          timestamp: Date.now()
        })).toString('base64')
      });

      console.log(`🎙️ Response sent successfully`);
      
      // After speaking, immediately start listening for next user input
      // Note: This happens automatically via the speak.ended webhook
      // No need to manually start another gather here to avoid duplicates

    } catch (error) {
      console.error(`❌ Error in handleAiGatherEnded:`, error);
      
      // Fallback - hang up the call
      try {
        await this.telnyxClient.calls.hangup(callData.call_control_id);
      } catch (hangupError) {
        console.error('❌ Error hanging up call:', hangupError);
      }
    }
  }

}