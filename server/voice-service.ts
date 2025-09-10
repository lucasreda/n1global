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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface TwilioCallWebhookData {
  AccountSid: string;
  CallSid: string;
  From: string;
  To: string;
  Direction: string;
  CallStatus: string;
  Duration?: string;
  StartTime?: string;
  EndTime?: string;
}

export class VoiceService {
  private customerOrderService: CustomerOrderService;
  private supportService: SupportService;

  constructor() {
    this.customerOrderService = new CustomerOrderService();
    this.supportService = new SupportService();
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
   * Handle incoming call from Twilio
   */
  async handleIncomingCall(callData: TwilioCallWebhookData): Promise<string> {
    try {
      // Extract operation from phone number (will need routing logic)
      const operationId = await this.getOperationFromPhoneNumber(callData.To);
      
      if (!operationId) {
        return this.generateHangupTwiML('Número não encontrado');
      }

      const availability = await this.isVoiceServiceAvailable(operationId);
      
      if (!availability.available) {
        return this.handleOutOfHours(availability.reason!, availability.settings);
      }

      // Create call record
      const callRecord: InsertVoiceCall = {
        operationId,
        twilioCallSid: callData.CallSid,
        twilioAccountSid: callData.AccountSid,
        direction: callData.Direction.toLowerCase() as 'inbound' | 'outbound',
        fromNumber: callData.From,
        toNumber: callData.To,
        status: callData.CallStatus.toLowerCase(),
        customerPhone: this.normalizePhoneNumber(callData.From),
        startTime: callData.StartTime ? new Date(callData.StartTime) : new Date(),
      };

      await db.insert(voiceCalls).values(callRecord);

      // Generate TwiML to connect to media stream
      return this.generateMediaStreamTwiML(callData.CallSid);
      
    } catch (error) {
      console.error('Error handling incoming call:', error);
      return this.generateHangupTwiML('Erro interno do servidor');
    }
  }

  /**
   * Handle call status updates from Twilio
   */
  async handleCallStatusUpdate(callData: TwilioCallWebhookData): Promise<void> {
    try {
      await db
        .update(voiceCalls)
        .set({
          status: callData.CallStatus.toLowerCase(),
          duration: callData.Duration ? parseInt(callData.Duration) : null,
          endTime: callData.EndTime ? new Date(callData.EndTime) : null,
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.twilioCallSid, callData.CallSid));

      console.log(`📞 Call ${callData.CallSid} status updated to ${callData.CallStatus}`);
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
        .where(eq(voiceCalls.twilioCallSid, callSid))
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
        .where(eq(voiceCalls.twilioCallSid, callSid))
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
          messageId: `voice-${call.twilioCallSid}`,
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
   * Build AI prompt for voice conversation
   */
  private async buildVoiceConversationPrompt(
    call: VoiceCall,
    customerMessage: string,
    conversationHistory: any[],
    directives: any[],
    customerContext: any
  ): Promise<string> {
    // Group directives by type (similar to email support)
    const directivesByType = directives.reduce((acc, directive: any) => {
      if (!acc[directive.type]) acc[directive.type] = [];
      acc[directive.type].push(directive);
      return acc;
    }, {} as Record<string, any[]>);

    // Build sections similar to email support
    const storeInfoSection = directivesByType.store_info?.length > 0 
      ? `INFORMAÇÕES DA EMPRESA:
${directivesByType.store_info.map((d: any) => `- ${d.content}`).join('\n')}
` 
      : `INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)
- Pagamento: Na entrega (COD - Cash on Delivery)  
- Horário: Segunda a sexta, 9h às 18h
`;

    const customerContextSection = customerContext ? `
CONTEXTO DO CLIENTE:
- Total de pedidos: ${customerContext.totalOrders}
- Pedidos entregues: ${customerContext.deliveredOrders}
- Valor total gasto: €${customerContext.totalValue}
- Tipo de cliente: ${customerContext.customerType}
` : '';

    const conversationHistorySection = conversationHistory.length > 0 ? `
HISTÓRICO DA CONVERSA:
${conversationHistory.map(msg => `${msg.speaker === 'customer' ? 'Cliente' : 'IA'}: ${msg.content}`).join('\n')}
` : '';

    const prompt = `Você é Sofia, uma assistente virtual empática que atende clientes por telefone. Esta é uma conversa de voz, então suas respostas devem ser naturais, concisas e adequadas para fala.

${storeInfoSection}
${customerContextSection}
${conversationHistorySection}

MENSAGEM ATUAL DO CLIENTE: "${customerMessage}"

INSTRUÇÕES PARA RESPOSTA DE VOZ:
- Seja concisa e natural (máximo 2-3 frases)
- Use linguagem falada, não escrita
- Seja empática e acolhedora
- Se necessário transferir para humano, diga claramente
- Foque na necessidade imediata do cliente

FORMATO DE RESPOSTA:
Responda APENAS com o texto que você falará para o cliente. Não use formatação especial nem instruções extras.

Se detectar uma situação que precisa de ticket de suporte, termine sua resposta com " [CRIAR_TICKET:categoria]" onde categoria pode ser: duvidas, reclamacoes, alteracao_endereco, cancelamento, manual.

Exemplo: "Entendo sua preocupação com o pedido. Vou verificar isso para você imediatamente. [CRIAR_TICKET:duvidas]"`;

    return prompt;
  }

  /**
   * Parse AI response for voice conversation
   */
  private parseAIVoiceResponse(aiResponse: string): {
    response: string;
    shouldCreateTicket: boolean;
    suggestedCategory?: string;
    detectedIntent?: string;
  } {
    // Check if AI wants to create a ticket
    const ticketMatch = aiResponse.match(/\[CRIAR_TICKET:(\w+)\]/);
    const shouldCreateTicket = !!ticketMatch;
    const suggestedCategory = ticketMatch?.[1] || undefined;
    
    // Clean response text
    const response = aiResponse.replace(/\[CRIAR_TICKET:\w+\]/, '').trim();
    
    // Simple intent detection based on keywords
    let detectedIntent = 'general_inquiry';
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('cancelar') || lowerResponse.includes('cancelamento')) {
      detectedIntent = 'cancellation';
    } else if (lowerResponse.includes('endereço') || lowerResponse.includes('mudar')) {
      detectedIntent = 'address_change';
    } else if (lowerResponse.includes('problema') || lowerResponse.includes('reclamação')) {
      detectedIntent = 'complaint';
    } else if (lowerResponse.includes('pedido') || lowerResponse.includes('entrega')) {
      detectedIntent = 'order_inquiry';
    }

    return {
      response,
      shouldCreateTicket,
      suggestedCategory,
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
      return this.generateHangupTwiML(message);
    }
    
    // Default to voicemail
    return this.generateVoicemailTwiML(message);
  }

  /**
   * Generate TwiML for media stream connection
   */
  private generateMediaStreamTwiML(callSid: string): string {
    const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = process.env.REPLIT_DEV_DOMAIN ? 'wss' : 'ws';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Olá! Sou a Sofia, sua assistente virtual. Como posso ajudá-lo hoje?</Say>
    <Connect>
        <Stream url="${protocol}://${domain}/api/voice/media-stream/${callSid}" />
    </Connect>
</Response>`;
  }

  /**
   * Generate TwiML for hangup
   */
  private generateHangupTwiML(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${message}</Say>
    <Hangup />
</Response>`;
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
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }
}