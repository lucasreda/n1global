import { Router } from "express";
import { VoiceService } from "./voice-service";
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import crypto from 'crypto';
import { db } from "./db";
import { voiceCalls, InsertVoiceCall } from "@shared/schema";
import * as ed25519 from '@noble/ed25519';

const router = Router();
const voiceService = new VoiceService();

/**
 * Telnyx Webhook Security Middleware - Validates Telnyx ed25519 signature
 */
async function validateTelnyxSignature(req: any, res: any, next: any) {
  try {
    const telnyxSignature = req.get('telnyx-signature-ed25519');
    const telnyxTimestamp = req.get('telnyx-timestamp');
    const publicKey = process.env.TELNYX_PUBLIC_KEY;
    
    // In production, always require TELNYX_PUBLIC_KEY
    if (!publicKey) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ TELNYX_PUBLIC_KEY not set in production - rejecting request');
        return res.status(403).json({ error: 'Forbidden: Public key not configured' });
      } else {
        console.warn('⚠️ TELNYX_PUBLIC_KEY not set - skipping signature validation in development');
        return next();
      }
    }
    
    if (!telnyxSignature || !telnyxTimestamp) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Missing Telnyx signature headers in production');
        return res.status(403).json({ error: 'Forbidden: Missing Telnyx signature' });
      } else {
        console.warn('⚠️ Missing Telnyx signature in development - allowing request');
        return next();
      }
    }

    // Validate timestamp (prevent replay attacks)
    const timestampThreshold = 5 * 60 * 1000; // 5 minutes
    const requestTimestamp = parseInt(telnyxTimestamp, 10) * 1000;
    const currentTimestamp = Date.now();
    
    if (Math.abs(currentTimestamp - requestTimestamp) > timestampThreshold) {
      console.error('❌ Telnyx webhook timestamp too old - potential replay attack');
      return res.status(403).json({ error: 'Forbidden: Request timestamp invalid' });
    }

    // Verify ed25519 signature
    if (process.env.NODE_ENV === 'production') {
      try {
        // Get raw body (should be captured by raw body middleware)
        const rawBody = req.rawBody || JSON.stringify(req.body);
        
        // Create signature payload following Telnyx spec: timestamp + | + complete JSON body
        const signedPayload = `${telnyxTimestamp}|${rawBody}`;
        
        // Convert signature from base64 to Uint8Array (Telnyx uses base64, not hex)
        const signatureBuffer = Buffer.from(telnyxSignature, 'base64');
        if (signatureBuffer.length !== 64) {
          console.error('❌ Invalid signature length - expected 64 bytes');
          return res.status(403).json({ error: 'Forbidden: Invalid signature format' });
        }
        const signatureBytes = new Uint8Array(signatureBuffer);
        
        // Convert public key from base64 to Uint8Array (Telnyx uses base64, not hex)
        const publicKeyBuffer = Buffer.from(publicKey, 'base64');
        if (publicKeyBuffer.length !== 32) {
          console.error('❌ Invalid public key length - expected 32 bytes');
          return res.status(403).json({ error: 'Forbidden: Invalid public key format' });
        }
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);
        
        // Verify signature
        const payloadBytes = new TextEncoder().encode(signedPayload);
        const isValid = await ed25519.verify(signatureBytes, payloadBytes, publicKeyBytes);
        
        if (!isValid) {
          console.error('❌ Telnyx webhook signature verification failed');
          return res.status(403).json({ error: 'Forbidden: Invalid signature' });
        }
        
        console.log('✅ Telnyx webhook signature verified successfully');
      } catch (sigError) {
        console.error('❌ Error verifying Telnyx signature:', sigError);
        return res.status(403).json({ error: 'Forbidden: Signature verification error' });
      }
    } else {
      console.log('✅ Telnyx webhook received with signature headers (dev mode)');
    }
    
    next();
  } catch (error) {
    console.error('❌ Error validating Telnyx signature:', error);
    return res.status(403).json({ error: 'Forbidden: Signature validation failed' });
  }
}

/**
 * Legacy Twilio Webhook Security Middleware - Kept for backward compatibility
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

// Lazy OpenAI initialization
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// Store active WebSocket connections
const activeConnections = new Map<string, {
  twilioWs?: WebSocket;
  openaiWs?: WebSocket;
  callSid: string;
  conversationHistory: any[];
}>();

/**
 * Telnyx Webhook: Incoming call handler
 */
router.post("/telnyx-incoming-call", validateTelnyxSignature, async (req, res) => {
  try {
    console.log("📞 Telnyx incoming call webhook received");
    console.log("Body:", req.body);
    
    // Extract callType and operationId from query parameters
    const callType = (req.query.callType as string) || 'test';
    const operationId = req.query.operationId as string;
    
    console.log(`🎯 Webhook callType: ${callType}, operationId: ${operationId}`);
    
    // Extract data from Telnyx webhook
    const eventData = req.body.data;
    const eventType = eventData?.event_type;
    
    if (!eventData || !eventType) {
      return res.status(200).json({ message: "Event ignored" });
    }

    // Handle different event types
    if (eventType === 'call.initiated') {
      await voiceService.handleIncomingCall(eventData.payload, callType);
    } else if (eventType === 'call.answered') {
      await voiceService.handleCallAnswered(eventData.payload, callType);
    } else if (eventType === 'call.speak.started') {
      // Sofia started speaking - enable barge-in (user can interrupt)
      console.log(`🎙️ Sofia started speaking - enabling barge-in detection`);
      await voiceService.handleSpeakStarted(eventData.payload, callType, operationId);
    } else if (eventType === 'call.speak.ended') {
      // After Sofia finishes speaking, activate WebSocket conversation system
      console.log(`🎙️ Welcome message finished - activating conversation system`);
      await voiceService.handleSpeakEnded(eventData.payload, callType, operationId);
    } else if (eventType === 'call.gather.ended') {
      console.log(`🎤 VOICE gathering completed - processing user speech`);
      console.log(`🗣️ Speech result: "${eventData.payload.speech || 'none'}"`);
      console.log(`🔢 Digits result: "${eventData.payload.digits || 'none'}"`);
      
      await voiceService.handleSpeechGatherEnded(eventData.payload, callType, operationId);
      
    } else if (eventType === 'call.transcription') {
      // Note: Telnyx transcription doesn't support Portuguese correctly
      // We're using OpenAI Whisper instead for better Portuguese recognition
      console.log(`📝 Telnyx transcription event received but ignored - using Whisper for Portuguese support`);
      
    } else if (eventType === 'call.ai_gather.ended') {
      console.log(`🤖 AI gather completed - processing user response`);
      console.log(`📄 Full AI gather payload:`, JSON.stringify(eventData.payload, null, 2));
      console.log(`📄 AI gather result structure:`, eventData.payload.result);
      console.log(`📋 Message history:`, eventData.payload.message_history);
      
      await voiceService.handleAiGatherEnded(eventData.payload, callType, operationId);
      
    } else if (eventType === 'call.hangup') {
      await voiceService.handleCallStatusUpdate(eventData.payload);
    } else {
      console.log(`ℹ️ Ignoring event type: ${eventType}`);
      return res.status(200).json({ message: "Event ignored" });
    }
    
    // Always return 200 OK for webhooks - call control happens via REST API
    res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("❌ Error handling Telnyx incoming call:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Legacy Twilio Webhook: Incoming call
 */
router.post("/incoming-call", validateTwilioSignature, async (req, res) => {
  try {
    console.log("📞 Legacy Twilio incoming call webhook:", req.body);
    
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
 * Telnyx Webhook: Call status updates
 */
router.post("/telnyx-call-status", validateTelnyxSignature, async (req, res) => {
  try {
    console.log("📞 Telnyx call status update webhook received");
    console.log("Body:", req.body);
    
    // Extract data from Telnyx webhook
    const eventData = req.body.data;
    if (!eventData || !eventData.payload) {
      return res.status(200).json({ message: "Event ignored" });
    }

    await voiceService.handleCallStatusUpdate(eventData.payload);
    
    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("❌ Error handling Telnyx call status update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Legacy Twilio Webhook: Call status updates
 */
router.post("/call-status", validateTwilioSignature, async (req, res) => {
  try {
    console.log("📞 Legacy Twilio call status update:", req.body);
    
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

    // Create call record for outbound test call (only if we have call data)
    if (CallSid && From && To) {
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
    } else {
      console.log('📞 Initial TwiML request - no call data to record yet');
    }

    // Generate welcome message using AI directives with call type
    const welcomeMessage = await voiceService.generateTestCallWelcomeMessage(operationId as string, validCallType);
    
    // Create TwiML response for the test call with absolute URL
    const baseUrl = `${urlValidation.protocol}://${urlValidation.domain}`;
    const callSidParam = CallSid ? `&amp;callSid=${CallSid}` : '';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${welcomeMessage}</Say>
    <Gather action="${baseUrl}/api/voice/test-call-response?operationId=${operationId}${callSidParam}&amp;callType=${validCallType}" method="POST" input="speech" timeout="10" speechTimeout="auto" language="pt-BR">
        <Say voice="Polly.Camila-Neural" language="pt-BR">Como posso ajudá-lo hoje?</Say>
    </Gather>
    <Say voice="Polly.Camila-Neural" language="pt-BR">Desculpe, não consegui ouvir sua resposta. Até logo!</Say>
    <Hangup />
</Response>`;

    console.log(`🎯 Generated TwiML for test call ${CallSid || 'initial request'}`);
    
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
    
    if (!operationId) {
      throw new Error('Operation ID is required');
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
      const callSidParam = callSid ? `&amp;callSid=${callSid}` : '';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Camila-Neural" language="pt-BR">${aiResponse}</Say>
    <Gather action="${baseUrl}/api/voice/test-call-response?operationId=${operationId}${callSidParam}&amp;callType=${validCallType}" method="POST" input="speech" timeout="10" speechTimeout="auto" language="pt-BR">
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
        
        // Configure the session with explicit Portuguese settings
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'nova', // Nova voice has better Portuguese support
            input_audio_format: 'mulaw',
            output_audio_format: 'mulaw',
            input_audio_transcription: {
              model: 'whisper-1',
              language: 'pt' // Explicit Portuguese language for transcription
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
            instructions: `IMPORTANTE: Você DEVE responder APENAS em português brasileiro. Nunca use inglês.

Você é Sofia, assistente virtual da Seraphine. Você atende clientes brasileiros por telefone sobre e-commerce.

REGRAS OBRIGATÓRIAS:
- SEMPRE fale em português brasileiro
- Seja concisa (máximo 2 frases)
- Use linguagem natural e falada
- Seja empática e acolhedora
- Ajude com pedidos, entregas, pagamentos

INFORMAÇÕES DA EMPRESA:
- Entregas: 2 a 7 dias úteis
- Pagamento: COD (na entrega)
- Atendimento: Segunda a sexta, 9h às 18h

Se não souber algo específico, ofereça transferir para atendente humano.

LEMBRE-SE: Responda SOMENTE em português brasileiro!`
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