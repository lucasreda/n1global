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
      
      // Get the call from database
      const [call] = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.telnyxCallControlId, callData.call_control_id))
        .limit(1);
      
      if (!call) {
        console.error(`❌ Call not found in database: ${callData.call_control_id}`);
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
      console.log(`🎙️ Speak ended for call ${callData.call_control_id} - activating bidirectional conversation`);
      
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
      
      // Only activate conversation system if this was the welcome message
      if (decodedState?.action === 'speaking_welcome') {
        console.log(`✅ Welcome message completed - starting media streaming for conversation`);
        
        // Start media streaming for bidirectional conversation
        await this.startMediaStreaming(callData.call_control_id, operationId, callType);
      } else {
        console.log(`ℹ️ Speak ended but not welcome message - skipping conversation activation`);
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
      
      // Only enable barge-in for AI responses, not welcome messages
      if (decodedState?.action === 'speaking_ai_response') {
        console.log(`🎤 Enabling barge-in detection during AI response`);
        
        // Start parallel speech detection while Sofia is speaking
        // This will allow user to interrupt Sofia at any time
        await this.startBargeInDetection(callData.call_control_id, operationId, callType);
      } else {
        console.log(`ℹ️ Skipping barge-in for welcome message`);
      }
      
    } catch (error) {
      console.error('Error handling speak started:', error);
    }
  }

  /**
   * Simplified barge-in detection (disabled for now to avoid complexity)
   */
  private async startBargeInDetection(callControlId: string, operationId: string, callType: string): Promise<void> {
    // SIMPLIFIED: Skip barge-in for now to get basic conversation working first
    console.log(`ℹ️ Barge-in detection skipped - focusing on basic conversation first`);
    return;
  }

  /**
   * Handle call status updates from Telnyx
   */
  async handleCallStatusUpdate(callData: TelnyxCallWebhookData): Promise<void> {
    try {
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
    conversationHistory: any[] = []
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
      
      // Build AI prompt for voice conversation
      const prompt = await this.buildVoiceConversationPrompt(
        call,
        customerMessage,
        conversationHistory,
        directives,
        customerContext
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
    customerContext: any
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

    // Build the complete intelligent prompt
    const prompt = `
Você é Sofia, uma assistente virtual experiente e altamente empática que atende clientes por telefone. Sua personalidade é acolhedora, profissional e adaptável ao estado emocional do cliente.

${storeInfoSection}${productInfoSection}${responseStyleSection}${customSection}${emotionalContextSection}${customerContextSection}${conversationHistorySection}

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
   * Start AI conversation by speaking welcome message
   */
  private async startAIConversation(callControlId: string, operationId: string, callType: string = 'test'): Promise<void> {
    if (!this.telnyxClient) {
      console.error('❌ Telnyx client not initialized - cannot start AI conversation');
      return;
    }
    
    try {
      console.log(`🤖 Starting AI conversation for call ${callControlId}`);
      console.log(`🎯 Using callType: ${callType} for welcome message generation`);
      
      // Generate welcome message with correct callType
      const welcomeMessage = await this.generateTestCallWelcomeMessage(operationId, callType);
      
      // Speak the welcome message
      const clientState = Buffer.from(JSON.stringify({ action: 'speaking_welcome' })).toString('base64');
      await this.telnyxClient.calls.speak(callControlId, {
        payload: welcomeMessage,
        language: 'pt-BR',
        voice: 'female',
        client_state: clientState
      });
      
      console.log(`🎙️ Welcome message sent to call ${callControlId}: "${welcomeMessage}"`);
    } catch (error) {
      console.error(`❌ Error starting AI conversation for call ${callControlId}:`, error);
      await this.hangupCall(callControlId, 'Erro ao iniciar conversa com IA');
    }
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
      
      // Speak the message
      const clientState = Buffer.from(JSON.stringify({ action: 'speaking_out_of_hours' })).toString('base64');
      await this.telnyxClient.calls.speak(callControlId, {
        payload: message,
        language: 'pt-BR',
        voice: 'female',
        client_state: clientState
      });
      
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
      
      // Skip streaming for now - use speech recognition instead
      throw new Error(`Using speech recognition instead of streaming`);
      
      console.log(`✅ Media streaming activated for call ${callControlId}`);
      
    } catch (error) {
      console.error(`❌ Error starting media streaming for call ${callControlId}:`, error);
      
      // Fallback: Continue with voice prompts
      console.log(`🔄 Falling back to prompt-based conversation`);
      await this.startPromptBasedConversation(callControlId, operationId, callType);
    }
  }

  /**
   * REAL SPEECH RECOGNITION - True voice conversation system
   */
  private async startPromptBasedConversation(callControlId: string, operationId: string, callType: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    try {
      console.log(`🎙️ Starting REAL voice conversation for call ${callControlId}`);
      
      // Start continuous voice recording with transcription
      await this.telnyxClient.calls.recordingStart(callControlId, {
        format: 'wav',
        channels: 'single',
        transcription: {
          transcription_engine: 'A',
          language: 'pt',
          transcription_tracks: 'inbound'
        },
        client_state: Buffer.from(JSON.stringify({ 
          action: 'voice_recording',
          operationId,
          callType,
          timestamp: Date.now()
        })).toString('base64')
      });
      
      console.log(`🎤 Voice recording with transcription started for ${callControlId}`);
      
      // Also try speech gather for real-time processing
      await this.startSpeechGather(callControlId, operationId, callType);
      
    } catch (error) {
      console.error(`❌ Error starting voice conversation:`, error);
      
      // Fallback to speech gather only
      try {
        console.log(`🔄 Fallback: Using speech gather only`);
        await this.startSpeechGather(callControlId, operationId, callType);
      } catch (fallbackError) {
        console.error(`❌ Speech gather fallback failed:`, fallbackError);
        
        // Final fallback - prompt for voice
        await this.telnyxClient.calls.speak(callControlId, {
          payload: "Por favor, fale agora. Estou escutando você.",
          payload_type: 'text',
          service_level: 'basic',
          voice: 'female'
        });
      }
    }
  }

  /**
   * Start speech recognition gather for real-time voice processing
   */
  private async startSpeechGather(callControlId: string, operationId: string, callType: string): Promise<void> {
    try {
      // Use Telnyx speech recognition
      await this.telnyxClient.calls.gather(callControlId, {
        minimum_digits: 0,
        maximum_digits: 0,
        timeout_millis: 10000,
        inter_digit_timeout_millis: 2000,
        initial_timeout_millis: 3000,
        terminating_digit: '#',
        valid_digits: '0123456789*#',
        speech_timeout_millis: 8000,
        speech_end_timeout_millis: 2000,
        speech_language: 'pt-BR',
        client_state: Buffer.from(JSON.stringify({
          action: 'speech_recognition',
          operationId,
          callType,
          timestamp: Date.now()
        })).toString('base64')
      });

      console.log(`🗣️ Speech recognition gather active for ${callControlId}`);
      
    } catch (error) {
      console.error(`❌ Speech gather failed:`, error);
      throw error;
    }
  }

  /**
   * Handle speech gather ended - process user speech and respond
   */
  async handleSpeechGatherEnded(callData: any, callType: string, operationId: string): Promise<void> {
    if (!this.telnyxClient) return;
    
    try {
      console.log(`🎤 Processing VOICE gather for call ${callData.call_control_id}`);
      console.log(`📝 Gather status: ${callData.status}`);
      console.log(`🗣️ Speech detected: ${callData.speech || 'none'}`);
      console.log(`🔢 Digits: ${callData.digits || 'none'}`);
      
      if (callData.status === 'valid') {
        let userInput = '';
        let inputType = '';
        
        // Prioritize speech over digits
        if (callData.speech && callData.speech.trim()) {
          userInput = callData.speech.trim();
          inputType = 'speech';
          console.log(`✅ User SPOKE: "${userInput}"`);
        } else if (callData.digits) {
          userInput = callData.digits;
          inputType = 'digits';
          console.log(`✅ User pressed: "${userInput}"`);
        }
        
        if (userInput) {
          // Generate intelligent AI response using the actual speech/input
          const aiResponse = await this.generateIntelligentResponse(userInput, inputType, operationId, callType);
          console.log(`🤖 AI Response: "${aiResponse}"`);
          
          // Speak the intelligent response
          await this.telnyxClient.calls.speak(callData.call_control_id, {
            payload: aiResponse,
            payload_type: 'text',
            service_level: 'basic',
            voice: 'female'
          });
          
          console.log(`🎙️ AI response sent successfully`);
          
          // Continue listening for more speech
          setTimeout(async () => {
            console.log(`🔄 Continuing conversation...`);
            await this.startPromptBasedConversation(callData.call_control_id, operationId, callType);
          }, 2000);
          
        } else {
          console.log(`❌ No valid input detected`);
          await this.promptForSpeech(callData.call_control_id, operationId, callType);
        }
        
      } else if (callData.status === 'timeout') {
        // No speech detected - encourage user to speak
        console.log(`⏰ No speech detected - encouraging user to speak`);
        
        await this.telnyxClient.calls.speak(callData.call_control_id, {
          payload: "Estou aqui! Pode falar à vontade. Como posso ajudá-lo?",
          payload_type: 'text',
          service_level: 'basic',
          voice: 'female'
        });
        
        // Try again after encouragement
        setTimeout(async () => {
          await this.startPromptBasedConversation(callData.call_control_id, operationId, callType);
        }, 3000);
        
      } else {
        console.log(`❌ Speech gather failed with status: ${callData.status}`);
        await this.endCallGracefully(callData.call_control_id);
      }
      
    } catch (error) {
      console.error('Error handling speech gather ended:', error);
      try {
        await this.endCallGracefully(callData.call_control_id);
      } catch (e) {
        console.error('Error ending call gracefully:', e);
      }
    }
  }

  /**
   * Generate intelligent AI response based on user speech/input
   */
  private async generateIntelligentResponse(userInput: string, inputType: string, operationId: string, callType: string): Promise<string> {
    try {
      // For now, use the existing AI response method but enhance it for speech
      if (inputType === 'speech') {
        return await this.generateTestCallResponse(operationId, userInput, callType);
      } else {
        // Handle digit input with context
        const digitResponses = {
          '1': 'Perfeito! Você escolheu a opção 1. Pode me falar mais sobre o que precisa?',
          '2': 'Ótimo! Opção 2 selecionada. Como posso ajudá-lo especificamente?',
          '0': 'Entendi, você quer falar com um atendente. Vou conectar você agora.',
          '*': 'Estou aqui para ajudar! Pode me contar o que está procurando?',
          '#': 'Obrigada! Fique à vontade para falar sobre suas necessidades.'
        };
        
        return digitResponses[userInput] || `Entendi que você pressionou ${userInput}. Como posso ajudá-lo?`;
      }
    } catch (error) {
      console.error('Error generating intelligent response:', error);
      return 'Desculpe, não consegui processar sua resposta. Pode repetir, por favor?';
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
          voice: 'female'
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
      
      let welcomeMessage = "Olá! Aqui é a Sofia, assistente virtual";
      
      // Add store name if available
      const storeNameDirective = storeInfoDirectives.find(d => 
        d.title?.toLowerCase().includes('nome') || 
        d.title?.toLowerCase().includes('empresa') ||
        d.content?.toLowerCase().includes('empresa')
      );
      
      if (storeNameDirective) {
        welcomeMessage += ` da ${storeNameDirective.content}`;
        console.log(`🏪 Added store name: ${storeNameDirective.content}`);
      }
      
      // Add context based on call type
      if (callType === 'sales') {
        welcomeMessage += ". Estou entrando em contato porque acredito que nossos produtos podem ser muito úteis para você. ";
        
        // Add product highlight if available
        const productDirective = directivesByType.product_info?.find(d => 
          d.content && d.content.length > 10
        );
        
        if (productDirective) {
          welcomeMessage += "Gostaria de conhecer um pouco sobre o que oferecemos?";
        } else {
          welcomeMessage += "Posso apresentar brevemente nossos serviços?";
        }
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
- Seja calorosa, confiante e profissional desde o primeiro contato
- Use linguagem persuasiva mas respeitosa, adequada para fala
- Identifique dores/necessidades do cliente e apresente soluções
- Destaque benefícios únicos e diferenciais competitivos
- Crie senso de urgência quando apropriado (ofertas limitadas, etc.)
- Conduza a conversa para próximos passos (agendamento, proposta, etc.)
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
}