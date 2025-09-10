import { Router } from "express";
import { VoiceService } from "./voice-service";
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';

const router = Router();
const voiceService = new VoiceService();

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
router.post("/incoming-call", async (req, res) => {
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
router.post("/call-status", async (req, res) => {
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
router.post("/transcription", async (req, res) => {
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