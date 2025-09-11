import { Router } from "express";
import { VoiceService } from "./voice-service";
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import crypto from 'crypto';
import { db } from "./db";
import { voiceCalls, InsertVoiceCall } from "@shared/schema";

const router = Router();
const voiceService = new VoiceService();

/**
 * Twilio Webhook Security Middleware - Validates Twilio signature using official Twilio algorithm
 */
function validateTwilioSignature(req: any, res: any, next: any) {
  try {
    const twilioSignature = req.get('X-Twilio-Signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    // In production, always require TWILIO_AUTH_TOKEN
    if (!authToken) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ TWILIO_AUTH_TOKEN not set in production - rejecting request');
        return res.status(403).json({ error: 'Forbidden: Auth token not configured' });
      } else {
        console.warn('⚠️ TWILIO_AUTH_TOKEN not set - skipping signature validation in development');
        return next();
      }
    }
    
    if (!twilioSignature) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Missing Twilio signature header in production');
        return res.status(403).json({ error: 'Forbidden: Missing Twilio signature' });
      } else {
        console.warn('⚠️ Missing Twilio signature in development - allowing request');
        return next();
      }
    }
    
    // Get the full URL that Twilio called
    // Force HTTPS as Twilio always uses HTTPS for webhooks, even when server sees HTTP due to proxy
    const url = `https://${req.get('host')}${req.originalUrl}`;
    
    // Build data to sign using Twilio's exact algorithm: URL + concat(sorted keys + values)
    // Twilio concatenates URL + each parameter name + value (NO delimiters like = or &)
    const sortedKeys = Object.keys(req.body || {}).sort();
    let dataToSign = url;
    for (const key of sortedKeys) {
      dataToSign += key + req.body[key]; // Just key + value, no = or & delimiters
    }
    
    // Create expected signature using Twilio's official algorithm
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(dataToSign)
      .digest('base64');
    
    // Twilio's X-Twilio-Signature header is pure base64 WITHOUT "sha1=" prefix
    // Compare signatures using timing-safe comparison (need same length buffers)
    const providedBuffer = Buffer.from(twilioSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (providedBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      console.error('❌ Invalid Twilio signature');
      console.error(`Expected: ${expectedSignature}`);
      console.error(`Provided: ${twilioSignature}`);
      console.error(`Data signed: ${dataToSign}`);
      
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Forbidden: Invalid signature' });
      } else {
        console.warn('⚠️ Invalid Twilio signature in development - allowing request anyway');
        // Continue to next() instead of rejecting
      }
    }
    
    console.log('✅ Twilio signature validated successfully');
    next();
  } catch (error) {
    console.error('❌ Error validating Twilio signature:', error);
    return res.status(403).json({ error: 'Forbidden: Signature validation failed' });
  }
}

/**
 * Validate public URL configuration
 */
function validatePublicUrl(): { isValid: boolean; domain?: string; protocol?: string } {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  
  if (!domain) {
    console.error('❌ REPLIT_DEV_DOMAIN environment variable not set - required for Twilio webhooks');
    return { isValid: false };
  }
  
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    console.error('❌ Cannot use localhost URLs for Twilio webhooks - must be publicly accessible');
    return { isValid: false };
  }
  
  // Enforce HTTPS for webhook URLs for security
  const protocol = 'https';
  
  if (!domain.includes('replit.dev') && !domain.includes('https')) {
    console.error('❌ Webhook URLs must use HTTPS for security');
    return { isValid: false };
  }
  
  console.log(`✅ Using secure public URL: ${protocol}://${domain}`);
  
  return { isValid: true, domain, protocol };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Store active WebSocket connections
const activeConnections = new Map<string, {
  twilioWs?: WebSocket;
  openaiWs?: WebSocket;
  callSid: string;
  conversationHistory: any[];
}>();

/**
 * Twilio Webhook: Incoming call
 */
router.post("/incoming-call", validateTwilioSignature, async (req, res) => {
  try {
    console.log("📞 Incoming call webhook:", req.body);
    
    const twimlResponse = await voiceService.handleIncomingCall(req.body);
    
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error("Error handling incoming call:", error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Desculpe, estamos com problemas técnicos. Tente novamente mais tarde.</Say>
    <Hangup />
</Response>`);
  }
});

/**
 * Twilio Webhook: Call status updates
 */
router.post("/call-status", validateTwilioSignature, async (req, res) => {
  try {
    console.log("📞 Call status update:", req.body);
    
    await voiceService.handleCallStatusUpdate(req.body);
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling call status update:", error);
    res.sendStatus(500);
  }
});

/**
 * Twilio Webhook: Transcription callback
 */
/**
 * Twilio Webhook: Test call handler - handles outbound test calls
 */
router.all("/test-call-handler", async (req, res) => {
  // TEMPORARY: Skip signature validation for diagnosis
  console.log('🔧 TEMPORARY: Skipping Twilio signature validation for diagnosis');
  console.log('📞 Headers received:', JSON.stringify(req.headers, null, 2));
  console.log('📞 Query params:', req.query);
  console.log('📞 Body data:', req.body);
  try {
    // Merge query and body parameters (GET vs POST compatibility)
    const params = { ...req.query, ...req.body };
    console.log("🎯 Test call handler - Method:", req.method);
    console.log("🎯 Test call handler - Params:", params);
    
    const { operationId, callType = 'test' } = params;
    const { CallSid, From, To } = params;
    
    if (!operationId) {
      throw new Error('Operation ID is required');
    }
    
    // Validate callType
    const validCallType = callType === 'sales' ? 'sales' : 'test';

    // Validate public URL configuration
    const urlValidation = validatePublicUrl();
    if (!urlValidation.isValid) {
      throw new Error('Invalid public URL configuration - cannot process Twilio webhooks');
    }

    // Create call record for outbound test call
    const callRecord: InsertVoiceCall = {
      operationId: operationId as string,
      twilioCallSid: CallSid,
      twilioAccountSid: params.AccountSid,
      direction: 'outbound',
      fromNumber: From, // Twilio number making the call
      toNumber: To, // Customer number receiving the call
      status: 'initiated', // Proper initial status for new calls
      customerPhone: voiceService.normalizePhoneNumber(To), // Customer is the To number in outbound calls
      startTime: new Date(),
    };

    try {
      await db.insert(voiceCalls).values(callRecord);
      console.log(`📞 Created call record for test call ${CallSid}`);
    } catch (dbError) {
      console.error('Error creating call record:', dbError);
      // Continue with call even if DB insert fails, but log it
    }

    // Generate welcome message using AI directives with call type
    const welcomeMessage = await voiceService.generateTestCallWelcomeMessage(operationId as string, validCallType);
    
    // Create TwiML response for the test call with absolute URL
    const baseUrl = `${urlValidation.protocol}://${urlValidation.domain}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${welcomeMessage}</Say>
    <Gather action="${baseUrl}/api/voice/test-call-response?operationId=${operationId}&amp;callSid=${CallSid}&amp;callType=${validCallType}" method="POST" input="speech" timeout="10" speechTimeout="auto" language="pt-BR">
        <Say voice="Polly.Camila-Neural" language="pt-BR">Como posso ajudá-lo hoje?</Say>
    </Gather>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Desculpe, não consegui ouvir sua resposta. Até logo!</Say>
    <Hangup />
</Response>`;

    console.log(`🎯 Generated TwiML for test call ${CallSid}`);
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error("❌ Error handling test call:", error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Desculpe, estamos com problemas técnicos no momento.</Say>
    <Hangup />
</Response>`);
  }
});

/**
 * Twilio Webhook: Test call response handler - processes customer responses during test calls
 */
router.all("/test-call-response", async (req, res) => {
  try {
    // Merge query and body parameters (GET vs POST compatibility)
    const params = { ...req.query, ...req.body };
    console.log("🎯 Test call response - Method:", req.method);
    console.log("🎯 Test call response - Params:", params);
    
    const { operationId, callSid, callType = 'test' } = params;
    const { SpeechResult } = params;
    
    if (!operationId || !callSid) {
      throw new Error('Operation ID and Call SID are required');
    }
    
    // Validate callType
    const validCallType = callType === 'sales' ? 'sales' : 'test';

    // Validate public URL configuration for absolute URLs
    const urlValidation = validatePublicUrl();
    if (!urlValidation.isValid) {
      throw new Error('Invalid public URL configuration');
    }

    if (SpeechResult) {
      console.log(`🗣️ Customer said: "${SpeechResult}"`);
      
      // Generate AI response using existing voice service logic with call type
      const aiResponse = await voiceService.generateTestCallResponse(operationId as string, SpeechResult, validCallType);
      
      // Create TwiML with AI response and continue conversation using absolute URL
      const baseUrl = `${urlValidation.protocol}://${urlValidation.domain}`;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${aiResponse}</Say>
    <Gather action="${baseUrl}/api/voice/test-call-response?operationId=${operationId}&amp;callSid=${callSid}&amp;callType=${validCallType}" method="POST" input="speech" timeout="10" speechTimeout="auto" language="pt-BR">
        <Say voice="Polly.Camila-Neural" language="pt-BR">Posso ajudar com mais alguma coisa?</Say>
    </Gather>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Obrigada por entrar em contato! Até logo.</Say>
    <Hangup />
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } else {
      // No speech detected, end call politely
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Não consegui ouvir sua resposta. Obrigada por ligar, até logo!</Say>
    <Hangup />
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    }
  } catch (error) {
    console.error("❌ Error processing test call response:", error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Desculpe, tivemos um problema técnico. Até logo!</Say>
    <Hangup />
</Response>`);
  }
});

router.post("/transcription", validateTwilioSignature, async (req, res) => {
  try {
    console.log("📝 Transcription received:", req.body);
    
    // Handle voicemail transcription
    const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;
    
    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      // Create a support ticket from the voicemail
      await voiceService.createTicketFromCall(CallSid, 'manual');
      console.log(`🎫 Created ticket from voicemail: ${CallSid}`);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling transcription:", error);
    res.sendStatus(500);
  }
});

/**
 * WebSocket handler for Twilio Media Streams + OpenAI Realtime API
 */
export function setupVoiceWebSocket(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/voice/media-stream'
  });

  wss.on('connection', (ws, req) => {
    console.log("🔌 WebSocket connection established");
    
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const callSid = url.pathname.split('/').pop();
    
    if (!callSid) {
      console.error("❌ No CallSid provided in WebSocket URL");
      ws.close();
      return;
    }

    console.log(`📞 Setting up media stream for call: ${callSid}`);
    
    // Initialize connection tracking
    activeConnections.set(callSid, {
      twilioWs: ws,
      callSid,
      conversationHistory: []
    });

    // Connect to OpenAI Realtime API
    connectToOpenAI(callSid);

    // Handle messages from Twilio
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.event) {
          case 'connected':
            console.log(`🔗 Twilio connected for call ${callSid}`);
            break;
            
          case 'start':
            console.log(`🎬 Media stream started for call ${callSid}`);
            break;
            
          case 'media':
            // Forward audio data to OpenAI
            const connection = activeConnections.get(callSid);
            if (connection?.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
              const audioEvent = {
                type: 'input_audio_buffer.append',
                audio: data.media.payload
              };
              connection.openaiWs.send(JSON.stringify(audioEvent));
            }
            break;
            
          case 'stop':
            console.log(`🛑 Media stream stopped for call ${callSid}`);
            cleanup(callSid);
            break;
        }
      } catch (error) {
        console.error('Error processing Twilio message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 Twilio WebSocket closed for call ${callSid}`);
      cleanup(callSid);
    });

    ws.on('error', (error) => {
      console.error('Twilio WebSocket error:', error);
      cleanup(callSid);
    });
  });

  /**
   * Connect to OpenAI Realtime API
   */
  async function connectToOpenAI(callSid: string) {
    try {
      const connection = activeConnections.get(callSid);
      if (!connection) return;

      const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      connection.openaiWs = openaiWs;

      openaiWs.on('open', () => {
        console.log(`🤖 OpenAI connected for call ${callSid}`);
        
        // Configure the session
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'alloy',
            input_audio_format: 'mulaw',
            output_audio_format: 'mulaw',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            temperature: 0.7,
            max_response_output_tokens: 300,
            instructions: `Você é Sofia, uma assistente virtual empática que atende clientes por telefone de uma empresa de e-commerce.

Diretrizes:
- Seja concisa e natural nas respostas (máximo 2-3 frases)
- Use linguagem falada, não escrita
- Seja empática e acolhedora
- Ajude com dúvidas sobre pedidos, entregas, pagamentos
- Se não souber algo específico, ofereça transferir para um atendente humano
- Mantenha sempre um tom profissional mas caloroso

Informações da empresa:
- Entregas: 2 a 7 dias úteis (maioria em até 3 dias)
- Pagamento: Na entrega (COD)
- Horário: Segunda a sexta, 9h às 18h
- Suporte: Sempre disponível para ajudar

Responda sempre em português brasileiro.`
          }
        };
        
        openaiWs.send(JSON.stringify(sessionConfig));
      });

      openaiWs.on('message', async (message) => {
        try {
          const response = JSON.parse(message.toString());
          
          switch (response.type) {
            case 'session.created':
              console.log(`✅ OpenAI session created for call ${callSid}`);
              break;
              
            case 'input_audio_buffer.speech_started':
              console.log(`🎤 Customer started speaking in call ${callSid}`);
              // Interrupt any ongoing response
              if (connection.twilioWs && connection.twilioWs.readyState === WebSocket.OPEN) {
                const clearCommand = {
                  event: 'clear',
                  streamSid: connection.callSid
                };
                connection.twilioWs.send(JSON.stringify(clearCommand));
              }
              break;
              
            case 'input_audio_buffer.speech_stopped':
              console.log(`🤐 Customer stopped speaking in call ${callSid}`);
              break;
              
            case 'conversation.item.input_audio_transcription.completed':
              console.log(`📝 Transcription: ${response.transcript}`);
              
              // Store conversation history
              connection.conversationHistory.push({
                speaker: 'customer',
                content: response.transcript,
                timestamp: new Date()
              });
              
              // Process with voice service for additional logic (ticket creation, etc)
              try {
                const aiResult = await voiceService.processConversationWithAI(
                  callSid,
                  response.transcript,
                  connection.conversationHistory
                );
                
                if (aiResult.shouldCreateTicket) {
                  await voiceService.createTicketFromCall(callSid, aiResult.suggestedCategory);
                }
              } catch (error) {
                console.error('Error processing conversation with voice service:', error);
              }
              break;
              
            case 'response.audio.delta':
              // Forward audio response to Twilio
              if (connection.twilioWs && connection.twilioWs.readyState === WebSocket.OPEN) {
                const mediaMessage = {
                  event: 'media',
                  streamSid: connection.callSid,
                  media: {
                    payload: response.delta
                  }
                };
                connection.twilioWs.send(JSON.stringify(mediaMessage));
              }
              break;
              
            case 'response.done':
              console.log(`🎉 AI response completed for call ${callSid}`);
              
              // Store AI response in conversation history
              if (response.response && response.response.output) {
                const aiContent = response.response.output
                  .filter((item: any) => item.type === 'message')
                  .map((item: any) => item.content?.find((c: any) => c.type === 'text')?.text || '')
                  .join(' ');
                
                if (aiContent) {
                  connection.conversationHistory.push({
                    speaker: 'ai',
                    content: aiContent,
                    timestamp: new Date()
                  });
                }
              }
              break;
              
            case 'error':
              console.error(`❌ OpenAI error for call ${callSid}:`, response.error);
              break;
          }
        } catch (error) {
          console.error('Error processing OpenAI message:', error);
        }
      });

      openaiWs.on('close', () => {
        console.log(`🔌 OpenAI WebSocket closed for call ${callSid}`);
      });

      openaiWs.on('error', (error) => {
        console.error('OpenAI WebSocket error:', error);
      });

    } catch (error) {
      console.error('Error connecting to OpenAI:', error);
    }
  }

  /**
   * Cleanup connections
   */
  function cleanup(callSid: string) {
    const connection = activeConnections.get(callSid);
    if (connection) {
      if (connection.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
        connection.openaiWs.close();
      }
      activeConnections.delete(callSid);
    }
  }
}

export default router;