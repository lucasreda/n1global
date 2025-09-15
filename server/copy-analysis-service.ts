import OpenAI from 'openai';

interface TranscriptData {
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  duration: number;
}

interface SceneData {
  id: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  audio?: {
    transcriptSnippet: string;
    voicePresent: boolean;
    musicDetected: boolean;
    ctas?: string[];
  };
  text?: Array<{
    content: string;
    position?: string;
  }>;
}

interface CopyAnalysisResult {
  persuasion: {
    score: number;
    triggers: {
      scarcity: number;
      urgency: number;
      socialProof: number;
      authority: number;
      reciprocity: number;
      emotion: number;
    };
    examples: Array<{
      trigger: string;
      text: string;
      timestamp: number;
      sceneId: number;
      strength: 'high' | 'medium' | 'low';
    }>;
  };
  narrative: {
    framework: 'AIDA' | 'PAS' | 'BAB' | '4Ps' | 'FAB' | 'Other';
    confidence: number;
    completeness: number;
    stages: Array<{
      name: string;
      startSec: number;
      endSec: number;
      excerpt: string;
      present: boolean;
    }>;
  };
  performance: {
    wpm: number;
    wps: number;
    avgPauseDuration: number;
    pauses: Array<{
      startSec: number;
      endSec: number;
      duration: number;
      purpose?: 'emphasis' | 'transition' | 'breathing';
    }>;
    attentionCurve: Array<{
      timestamp: number;
      score: number;
      reason?: string;
    }>;
    speechDensity: number;
    clarity: number;
  };
  personaTone: {
    audienceFit: number;
    voiceConsistency: number;
    tone: string;
    personas: string[];
    toneShifts: Array<{
      timestamp: number;
      fromTone: string;
      toTone: string;
    }>;
    empathyScore: number;
  };
  powerWords: {
    action: string[];
    emotional: string[];
    sensory: string[];
    benefitDensity: number;
    keywordDensity: Array<{
      word: string;
      count: number;
      density: number;
    }>;
    ctaPower: number;
  };
  hooks: {
    openingHookStrength: number;
    openingHookType: string;
    closingHookStrength: number;
    secondaryHooks: Array<{
      timestamp: number;
      type: string;
      text: string;
    }>;
  };
  sceneInsights: Array<{
    sceneId: number;
    copyStrength: number;
    suggestions: string[];
    detectedElements: string[];
    improvementPriority: 'high' | 'medium' | 'low';
    gatilhosPresentes: string[];
  }>;
  persuasiveTimeline: Array<{
    startSec: number;
    endSec: number;
    elements: string[];
    cta?: string;
    strength: number;
    type: 'hook' | 'problem' | 'agitation' | 'solution' | 'cta' | 'proof' | 'benefit';
  }>;
}

export class CopyAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getDefaultAnalysis(): CopyAnalysisResult {
    return {
      persuasion: {
        score: 0,
        triggers: {
          scarcity: 0,
          urgency: 0,
          socialProof: 0,
          authority: 0,
          reciprocity: 0,
          emotion: 0
        },
        examples: []
      },
      narrative: {
        framework: 'Other',
        confidence: 0,
        completeness: 0,
        stages: []
      },
      performance: {
        wpm: 0,
        wps: 0,
        avgPauseDuration: 0,
        pauses: [],
        attentionCurve: [],
        speechDensity: 0,
        clarity: 0
      },
      personaTone: {
        tone: 'neutral',
        audienceFit: 0,
        voiceConsistency: 0,
        personas: [],
        toneShifts: [],
        empathyScore: 0
      },
      powerWords: {
        action: [],
        emotional: [],
        sensory: [],
        benefitDensity: 0,
        ctaPower: 0,
        keywordDensity: []
      },
      hooks: {
        openingHookStrength: 0,
        openingHookType: 'none',
        closingHookStrength: 0,
        secondaryHooks: []
      },
      sceneInsights: [],
      persuasiveTimeline: []
    };
  }

  async analyze(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    duration: number
  ): Promise<CopyAnalysisResult> {
    console.log('📝 Starting copy analysis...');

    // Return default analysis if no transcript
    if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
      console.log('⚠️ No transcript data available - returning default copy analysis');
      return this.getDefaultAnalysis();
    }

    // Analyze triggers and persuasion elements
    const persuasionAnalysis = await this.analyzePersuasion(transcriptData, scenes);
    
    // Detect narrative framework
    const narrativeAnalysis = await this.analyzeNarrative(transcriptData, scenes);
    
    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformance(transcriptData, scenes);
    
    // Analyze tone and persona
    const personaToneAnalysis = await this.analyzePersonaTone(transcriptData);
    
    // Extract power words
    const powerWordsAnalysis = this.extractPowerWords(transcriptData);
    
    // Analyze hooks
    const hooksAnalysis = this.analyzeHooks(transcriptData, scenes);
    
    // Generate scene-specific insights
    const sceneInsights = await this.generateSceneInsights(scenes, persuasionAnalysis, narrativeAnalysis);
    
    // Create persuasive timeline
    const persuasiveTimeline = this.createPersuasiveTimeline(
      transcriptData,
      scenes,
      narrativeAnalysis,
      persuasionAnalysis
    );

    console.log('✅ Copy analysis complete');

    return {
      persuasion: persuasionAnalysis,
      narrative: narrativeAnalysis,
      performance: performanceMetrics,
      personaTone: personaToneAnalysis,
      powerWords: powerWordsAnalysis,
      hooks: hooksAnalysis,
      sceneInsights,
      persuasiveTimeline
    };
  }

  private async analyzePersuasion(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<CopyAnalysisResult['persuasion']> {
    const triggers = {
      scarcity: 0,
      urgency: 0,
      socialProof: 0,
      authority: 0,
      reciprocity: 0,
      emotion: 0
    };
    
    const examples: CopyAnalysisResult['persuasion']['examples'] = [];
    const transcript = transcriptData.transcript.toLowerCase();

    // Scarcity patterns (Portuguese, Italian, English)
    const scarcityPatterns = [
      // Portuguese
      'últim', 'limitad', 'poucas unidades', 'apenas', 'exclusiv', 
      'esgotando', 'acabando', 'restam', 'disponibilidade limitada',
      'poucos', 'raros', 'únicos',
      // Italian
      'ultim', 'limitat', 'poche', 'solo', 'esclusiv', 'soli',
      'esaurendo', 'finendo', 'rimangono', 'disponibilità', 'pochi',
      'rari', 'unici', 'quattro', 'tre', 'due', 'set',
      // English
      'last', 'limited', 'few', 'only', 'exclusive',
      'running out', 'ending', 'remaining', 'availability',
      'rare', 'unique'
    ];
    
    // Urgency patterns (Portuguese, Italian, English)
    const urgencyPatterns = [
      // Portuguese
      'agora', 'hoje', 'já', 'imediatamente', 'não perca', 'aproveite',
      'termina', 'acaba', 'por tempo limitado', 'oferta relâmpago',
      'últimas horas', 'últimos dias',
      // Italian
      'ora', 'oggi', 'subito', 'immediatamente', 'non perdere', 'approfitta',
      'termina', 'finisce', 'tempo limitato', 'offerta lampo', 'adesso',
      'ultime ore', 'ultimi giorni', 'occasione', 'ordina', 'ordine',
      // English
      'now', 'today', 'immediately', "don't miss", 'take advantage',
      'ends', 'limited time', 'flash offer', 'last hours', 'final days'
    ];
    
    // Social proof patterns (Portuguese, Italian, English)
    const socialProofPatterns = [
      // Portuguese
      'milhares', 'milhões', 'clientes', 'pessoas', 'avaliações',
      'depoimentos', 'aprovado', 'recomendado', 'mais vendido',
      'sucesso', 'resultados comprovados', 'testado',
      // Italian
      'migliaia', 'milioni', 'clienti', 'persone', 'valutazioni',
      'testimonianze', 'approvato', 'raccomandato', 'più venduto',
      'successo', 'risultati comprovati', 'testato',
      // English
      'thousands', 'millions', 'customers', 'people', 'reviews',
      'testimonials', 'approved', 'recommended', 'best seller',
      'success', 'proven results', 'tested'
    ];
    
    // Authority patterns (Portuguese, Italian, English)
    const authorityPatterns = [
      // Portuguese
      'especialista', 'profissional', 'certificado', 'qualidade',
      'líder', 'referência', 'autoridade', 'doutor', 'aprovado por',
      'garantia', 'comprovado cientificamente', 'estudos',
      // Italian
      'esperto', 'professionale', 'certificato', 'qualità',
      'leader', 'riferimento', 'autorità', 'dottore', 'approvato da',
      'garanzia', 'provato scientificamente', 'studi', 'vera', 'nostro',
      'completo', 'totale',
      // English
      'expert', 'professional', 'certified', 'quality',
      'leader', 'reference', 'authority', 'doctor', 'approved by',
      'guarantee', 'scientifically proven', 'studies'
    ];
    
    // Reciprocity patterns (Portuguese, Italian, English)
    const reciprocityPatterns = [
      // Portuguese
      'grátis', 'bônus', 'presente', 'oferta', 'desconto',
      'promoção', 'benefício', 'vantagem', 'extra', 'cortesia',
      // Italian
      'gratis', 'bonus', 'regalo', 'offerta', 'sconto',
      'promozione', 'beneficio', 'vantaggio', 'extra', 'omaggio',
      'soli', 'prenota', 'paghi', 'consegna', 'spedizione',
      // English
      'free', 'bonus', 'gift', 'offer', 'discount',
      'promotion', 'benefit', 'advantage', 'extra', 'courtesy',
      'delivery', 'shipping'
    ];
    
    // Emotion patterns (Portuguese, Italian, English)
    const emotionPatterns = [
      // Portuguese
      'incrível', 'fantástico', 'maravilhoso', 'surpreendente',
      'revolucionário', 'transformar', 'mudar', 'sonho', 'desejo',
      'felicidade', 'satisfação', 'prazer', 'amor', 'paixão',
      // Italian
      'incredibile', 'fantastico', 'meraviglioso', 'sorprendente',
      'rivoluzionario', 'trasformare', 'cambiare', 'sogno', 'desiderio',
      'felicità', 'soddisfazione', 'piacere', 'amore', 'passione',
      'lusso', 'lussuosa', 'morbida', 'stelle', 'eleganti', 'tocco',
      'seta', 'comfort', 'bellezza', 'notte', 'sogni', 'merita',
      'accarezza', 'ogni',
      // English
      'incredible', 'fantastic', 'wonderful', 'amazing',
      'revolutionary', 'transform', 'change', 'dream', 'desire',
      'happiness', 'satisfaction', 'pleasure', 'love', 'passion',
      'luxury', 'comfort', 'beauty'
    ];

    // Also analyze numbers (prices, discounts)
    const numberPattern = /\b\d+(?:[,.]\d+)?\s*(?:%|€|euro|percento)?\b/gi;
    const numberMatches = transcript.match(numberPattern);
    if (numberMatches) {
      numberMatches.forEach(match => {
        const num = parseFloat(match.replace(',', '.').replace(/[^0-9.]/g, ''));
        // Discounts and low prices are scarcity/urgency triggers
        if (match.includes('%') || match.includes('percento')) {
          triggers.scarcity += 10;
          triggers.urgency += 8;
          triggers.reciprocity += 5;
        } else if (num < 100) {
          triggers.scarcity += 3;
          triggers.reciprocity += 3;
        }
      });
    }

    // Analyze each trigger
    const analyzePattern = (patterns: string[], triggerName: string, triggerKey: keyof typeof triggers) => {
      patterns.forEach(pattern => {
        const regex = new RegExp(`\\b${pattern}`, 'gi');
        const matches = transcript.match(regex);
        if (matches) {
          // Weighted scoring based on pattern importance
          const weight = pattern.length > 6 ? 8 : 5;
          triggers[triggerKey] += matches.length * weight;
          
          // Find timestamp for first occurrence
          const firstMatch = transcriptData.segments.find(seg => 
            seg.text.toLowerCase().includes(pattern)
          );
          
          if (firstMatch) {
            const scene = scenes.find(s => 
              firstMatch.start >= s.startSec && firstMatch.start < s.endSec
            );
            
            examples.push({
              trigger: triggerName,
              text: firstMatch.text.substring(0, 100),
              timestamp: firstMatch.start,
              sceneId: scene?.id || 1,
              strength: matches.length > 2 ? 'high' : matches.length > 1 ? 'medium' : 'low'
            });
          }
        }
      });
    };

    analyzePattern(scarcityPatterns, 'Escassez', 'scarcity');
    analyzePattern(urgencyPatterns, 'Urgência', 'urgency');
    analyzePattern(socialProofPatterns, 'Prova Social', 'socialProof');
    analyzePattern(authorityPatterns, 'Autoridade', 'authority');
    analyzePattern(reciprocityPatterns, 'Reciprocidade', 'reciprocity');
    analyzePattern(emotionPatterns, 'Emoção', 'emotion');

    // Normalize scores (0-10) with generous scaling
    Object.keys(triggers).forEach(key => {
      const score = triggers[key as keyof typeof triggers];
      // Very generous normalization - even 1-2 matches give meaningful score
      const normalized = score > 0 ? Math.max(2, Math.min(10, Math.sqrt(score) * 3)) : 0;
      triggers[key as keyof typeof triggers] = Math.round(normalized * 10) / 10;
    });

    // Calculate overall persuasion score
    const avgScore = Object.values(triggers).reduce((a, b) => a + b, 0) / Object.values(triggers).length;

    return {
      score: Math.round(avgScore * 10) / 10,
      triggers,
      examples: examples.slice(0, 10) // Limit to top 10 examples
    };
  }

  private async analyzeNarrative(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<CopyAnalysisResult['narrative']> {
    const transcript = transcriptData.transcript.toLowerCase();
    const segments = transcriptData.segments;
    
    // Framework detection patterns
    const frameworks = {
      AIDA: {
        stages: ['Attention', 'Interest', 'Desire', 'Action'],
        patterns: [
          ['você sabia', 'atenção', 'olhe', 'veja', 'descubra', 'novo'],
          ['interessante', 'curioso', 'benefício', 'vantagem', 'como'],
          ['imagine', 'deseja', 'quer', 'sonha', 'transforma', 'muda'],
          ['clique', 'compre', 'acesse', 'garanta', 'aproveite', 'agora']
        ]
      },
      PAS: {
        stages: ['Problem', 'Agitation', 'Solution'],
        patterns: [
          ['problema', 'dificuldade', 'cansado', 'frustrado', 'sofre'],
          ['pior', 'consequência', 'continuar', 'perder', 'custo'],
          ['solução', 'resolver', 'acabar', 'eliminar', 'finalmente']
        ]
      },
      BAB: {
        stages: ['Before', 'After', 'Bridge'],
        patterns: [
          ['antes', 'atualmente', 'hoje', 'agora', 'situação'],
          ['depois', 'futuro', 'resultado', 'transformação', 'novo'],
          ['como', 'método', 'sistema', 'processo', 'caminho']
        ]
      }
    };

    let detectedFramework: CopyAnalysisResult['narrative']['framework'] = 'Other';
    let maxConfidence = 0;
    let bestStages: CopyAnalysisResult['narrative']['stages'] = [];

    // Check each framework
    for (const [frameworkName, frameworkData] of Object.entries(frameworks)) {
      const stages: CopyAnalysisResult['narrative']['stages'] = [];
      let stageMatches = 0;
      let totalStages = frameworkData.stages.length;
      
      frameworkData.stages.forEach((stageName, stageIndex) => {
        const patterns = frameworkData.patterns[stageIndex];
        let stageFound = false;
        let stageStart = -1;
        let stageEnd = -1;
        let stageExcerpt = '';
        
        // Check if patterns exist in order
        for (const pattern of patterns) {
          const matchIndex = transcript.indexOf(pattern);
          if (matchIndex !== -1) {
            stageFound = true;
            
            // Find the segment containing this pattern
            const segment = segments.find(seg => 
              seg.text.toLowerCase().includes(pattern)
            );
            
            if (segment) {
              if (stageStart === -1 || segment.start < stageStart) {
                stageStart = segment.start;
                stageExcerpt = segment.text.substring(0, 100);
              }
              if (segment.end > stageEnd) {
                stageEnd = segment.end;
              }
            }
          }
        }
        
        stages.push({
          name: stageName,
          startSec: stageStart !== -1 ? stageStart : stageIndex * (transcriptData.duration / totalStages),
          endSec: stageEnd !== -1 ? stageEnd : (stageIndex + 1) * (transcriptData.duration / totalStages),
          excerpt: stageExcerpt || `[${stageName} não claramente identificado]`,
          present: stageFound
        });
        
        if (stageFound) stageMatches++;
      });
      
      const confidence = (stageMatches / totalStages) * 100;
      
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedFramework = frameworkName as CopyAnalysisResult['narrative']['framework'];
        bestStages = stages;
      }
    }

    // Calculate completeness
    const completeness = (bestStages.filter(s => s.present).length / bestStages.length) * 100;

    return {
      framework: detectedFramework,
      confidence: Math.round(maxConfidence),
      completeness: Math.round(completeness),
      stages: bestStages
    };
  }

  private calculatePerformance(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): CopyAnalysisResult['performance'] {
    const words = transcriptData.words;
    const duration = transcriptData.duration;
    
    // Calculate WPM and WPS
    const totalWords = words.length;
    const durationMinutes = duration / 60;
    const wpm = Math.round(totalWords / durationMinutes);
    const wps = Math.round((totalWords / duration) * 10) / 10;
    
    // Detect pauses
    const pauses: CopyAnalysisResult['performance']['pauses'] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      if (gap > 0.5) { // Pause longer than 0.5 seconds
        let purpose: 'emphasis' | 'transition' | 'breathing' = 'breathing';
        
        if (gap > 2) purpose = 'transition';
        else if (gap > 1) purpose = 'emphasis';
        
        pauses.push({
          startSec: words[i].end,
          endSec: words[i + 1].start,
          duration: Math.round(gap * 10) / 10,
          purpose
        });
      }
    }
    
    // Calculate average pause duration
    const avgPauseDuration = pauses.length > 0 
      ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length 
      : 0;
    
    // Generate attention curve (simplified)
    const attentionCurve: CopyAnalysisResult['performance']['attentionCurve'] = [];
    const curvePoints = 10;
    for (let i = 0; i <= curvePoints; i++) {
      const timestamp = (duration / curvePoints) * i;
      let score = 5;
      
      // Higher attention at beginning
      if (i === 0) score = 8;
      // Drop in middle
      else if (i > 3 && i < 7) score = 4;
      // Rise at end for CTA
      else if (i >= 8) score = 7;
      
      // Adjust based on pause proximity
      const nearPause = pauses.some(p => 
        Math.abs(p.startSec - timestamp) < 1
      );
      if (nearPause) score += 1;
      
      attentionCurve.push({
        timestamp: Math.round(timestamp * 10) / 10,
        score: Math.min(10, score),
        reason: i === 0 ? 'Opening hook' : i >= 8 ? 'CTA zone' : undefined
      });
    }
    
    // Calculate speech density and clarity
    const speechTime = duration - pauses.reduce((sum, p) => sum + p.duration, 0);
    const speechDensity = Math.round((speechTime / duration) * 100);
    const clarity = wpm > 180 ? 6 : wpm > 150 ? 8 : 10; // Too fast reduces clarity
    
    return {
      wpm,
      wps,
      avgPauseDuration: Math.round(avgPauseDuration * 10) / 10,
      pauses: pauses.slice(0, 10), // Limit to top 10 pauses
      attentionCurve,
      speechDensity,
      clarity
    };
  }

  private async analyzePersonaTone(
    transcriptData: TranscriptData
  ): Promise<CopyAnalysisResult['personaTone']> {
    const transcript = transcriptData.transcript.toLowerCase();
    
    // Tone detection
    let tone = 'neutral';
    const toneIndicators = {
      professional: ['profissional', 'qualidade', 'excelência', 'serviço', 'empresa'],
      casual: ['olá', 'oi', 'cara', 'galera', 'pessoal'],
      urgent: ['agora', 'urgente', 'rápido', 'imediato', 'já'],
      friendly: ['amigo', 'você', 'juntos', 'vamos', 'nosso'],
      authoritative: ['deve', 'precisa', 'importante', 'essencial', 'fundamental']
    };
    
    let maxToneScore = 0;
    for (const [toneName, indicators] of Object.entries(toneIndicators)) {
      const score = indicators.filter(ind => transcript.includes(ind)).length;
      if (score > maxToneScore) {
        maxToneScore = score;
        tone = toneName;
      }
    }
    
    // Persona detection
    const personas: string[] = [];
    if (transcript.includes('você') || transcript.includes('seu')) {
      personas.push('Direto ao consumidor');
    }
    if (transcript.includes('empresa') || transcript.includes('negócio')) {
      personas.push('B2B');
    }
    if (transcript.includes('família') || transcript.includes('crianças')) {
      personas.push('Familiar');
    }
    if (transcript.includes('jovem') || transcript.includes('moderno')) {
      personas.push('Jovem adulto');
    }
    
    // Voice consistency (simplified - check for tone shifts)
    const segments = transcriptData.segments;
    const toneShifts: CopyAnalysisResult['personaTone']['toneShifts'] = [];
    let currentTone = tone;
    
    segments.forEach((segment, index) => {
      const segmentText = segment.text.toLowerCase();
      for (const [toneName, indicators] of Object.entries(toneIndicators)) {
        if (indicators.some(ind => segmentText.includes(ind)) && toneName !== currentTone) {
          toneShifts.push({
            timestamp: segment.start,
            fromTone: currentTone,
            toTone: toneName
          });
          currentTone = toneName;
          break;
        }
      }
    });
    
    // Calculate scores
    const voiceConsistency = Math.max(0, 10 - (toneShifts.length * 2));
    const audienceFit = personas.length > 0 ? 8 : 5;
    const empathyScore = transcript.includes('entend') || transcript.includes('sab') || 
                        transcript.includes('sofr') || transcript.includes('precis') ? 8 : 5;
    
    return {
      audienceFit,
      voiceConsistency,
      tone,
      personas: personas.length > 0 ? personas : ['Geral'],
      toneShifts: toneShifts.slice(0, 5),
      empathyScore
    };
  }

  private extractPowerWords(
    transcriptData: TranscriptData
  ): CopyAnalysisResult['powerWords'] {
    const transcript = transcriptData.transcript.toLowerCase();
    const words = transcript.split(/\s+/);
    
    // Power word categories
    const actionWords = [
      'compre', 'clique', 'acesse', 'garanta', 'aproveite', 'descubra',
      'transforme', 'mude', 'conquiste', 'alcance', 'realize', 'obtenha'
    ];
    
    const emotionalWords = [
      'incrível', 'fantástico', 'maravilhoso', 'surpreendente', 'único',
      'exclusivo', 'especial', 'revolucionário', 'inovador', 'poderoso'
    ];
    
    const sensoryWords = [
      'veja', 'sinta', 'toque', 'experimente', 'prove', 'ouça',
      'suave', 'macio', 'quente', 'frio', 'brilhante', 'vibrante'
    ];
    
    // Extract found words
    const foundAction = actionWords.filter(word => transcript.includes(word));
    const foundEmotional = emotionalWords.filter(word => transcript.includes(word));
    const foundSensory = sensoryWords.filter(word => transcript.includes(word));
    
    // Calculate benefit density
    const benefitWords = ['benefício', 'vantagem', 'ganho', 'economia', 'resultado', 'sucesso'];
    const benefitCount = benefitWords.filter(word => transcript.includes(word)).length;
    const benefitDensity = Math.min(10, (benefitCount / (words.length / 100)) * 10);
    
    // Calculate keyword density
    const wordFrequency: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 4) { // Only count meaningful words
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    const keywordDensity = Object.entries(wordFrequency)
      .filter(([word, count]) => count > 1)
      .map(([word, count]) => ({
        word,
        count,
        density: Math.round((count / words.length) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // CTA Power (strength of call-to-action)
    const ctaStrength = foundAction.length * 2 + 
                       (transcript.includes('agora') ? 2 : 0) +
                       (transcript.includes('hoje') ? 2 : 0) +
                       (transcript.includes('clique') ? 3 : 0);
    const ctaPower = Math.min(10, ctaStrength);
    
    return {
      action: foundAction,
      emotional: foundEmotional,
      sensory: foundSensory,
      benefitDensity: Math.round(benefitDensity * 10) / 10,
      keywordDensity,
      ctaPower
    };
  }

  private analyzeHooks(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): CopyAnalysisResult['hooks'] {
    const segments = transcriptData.segments;
    if (segments.length === 0) {
      return {
        openingHookStrength: 0,
        openingHookType: 'None',
        closingHookStrength: 0,
        secondaryHooks: []
      };
    }
    
    // Analyze opening hook (first 3 seconds)
    const openingSegments = segments.filter(s => s.start < 3);
    const openingText = openingSegments.map(s => s.text).join(' ').toLowerCase();
    
    let openingHookType = 'Statement';
    let openingHookStrength = 5;
    
    if (openingText.includes('?')) {
      openingHookType = 'Question';
      openingHookStrength = 8;
    } else if (openingText.includes('você sabia') || openingText.includes('descubra')) {
      openingHookType = 'Curiosity';
      openingHookStrength = 9;
    } else if (openingText.includes('problema') || openingText.includes('cansado')) {
      openingHookType = 'Problem';
      openingHookStrength = 7;
    } else if (openingText.includes('!')) {
      openingHookType = 'Exclamation';
      openingHookStrength = 7;
    }
    
    // Analyze closing hook (last 5 seconds)
    const lastTimestamp = transcriptData.duration - 5;
    const closingSegments = segments.filter(s => s.start > lastTimestamp);
    const closingText = closingSegments.map(s => s.text).join(' ').toLowerCase();
    
    let closingHookStrength = 5;
    if (closingText.includes('clique') || closingText.includes('acesse')) {
      closingHookStrength = 8;
    }
    if (closingText.includes('agora') || closingText.includes('hoje')) {
      closingHookStrength = 9;
    }
    if (closingText.includes('oferta') || closingText.includes('desconto')) {
      closingHookStrength = 10;
    }
    
    // Find secondary hooks throughout
    const secondaryHooks: CopyAnalysisResult['hooks']['secondaryHooks'] = [];
    
    segments.forEach((segment, index) => {
      const text = segment.text.toLowerCase();
      
      // Check for pattern interrupts or hooks
      if (text.includes('mas') || text.includes('porém') || text.includes('entretanto')) {
        secondaryHooks.push({
          timestamp: segment.start,
          type: 'Contrast',
          text: segment.text.substring(0, 50)
        });
      } else if (text.includes('imagine') || text.includes('pense')) {
        secondaryHooks.push({
          timestamp: segment.start,
          type: 'Visualization',
          text: segment.text.substring(0, 50)
        });
      } else if (text.includes('segredo') || text.includes('revelado')) {
        secondaryHooks.push({
          timestamp: segment.start,
          type: 'Secret',
          text: segment.text.substring(0, 50)
        });
      }
    });
    
    return {
      openingHookStrength,
      openingHookType,
      closingHookStrength,
      secondaryHooks: secondaryHooks.slice(0, 5)
    };
  }

  private async generateSceneInsights(
    scenes: SceneData[],
    persuasion: CopyAnalysisResult['persuasion'],
    narrative: CopyAnalysisResult['narrative']
  ): Promise<CopyAnalysisResult['sceneInsights']> {
    return scenes.map(scene => {
      const suggestions: string[] = [];
      const detectedElements: string[] = [];
      const gatilhosPresentes: string[] = [];
      
      // Check which triggers are present in this scene
      persuasion.examples.forEach(example => {
        if (example.sceneId === scene.id) {
          gatilhosPresentes.push(example.trigger);
          detectedElements.push(`${example.trigger} detectado`);
        }
      });
      
      // Check narrative stage
      narrative.stages.forEach(stage => {
        if (scene.startSec >= stage.startSec && scene.startSec < stage.endSec) {
          detectedElements.push(`Estágio ${stage.name}`);
        }
      });
      
      // Add CTAs if present
      if (scene.audio?.ctas && scene.audio.ctas.length > 0) {
        detectedElements.push('CTA presente');
      }
      
      // Generate suggestions based on what's missing
      let copyStrength = 5;
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      // Scene-specific suggestions
      if (scene.id === 1) {
        // First scene suggestions
        if (!gatilhosPresentes.includes('Curiosidade')) {
          suggestions.push('Adicione um hook de curiosidade nos primeiros 3 segundos');
          priority = 'high';
        }
        copyStrength = gatilhosPresentes.length > 0 ? 7 : 4;
      } else if (scene.endSec >= scenes[scenes.length - 1].endSec - 5) {
        // Last scene suggestions
        if (!scene.audio?.ctas || scene.audio.ctas.length === 0) {
          suggestions.push('Adicione um CTA claro e direto no final');
          priority = 'high';
        }
        if (!gatilhosPresentes.includes('Urgência')) {
          suggestions.push('Reforce urgência no CTA final');
        }
        copyStrength = scene.audio?.ctas ? 8 : 3;
      } else {
        // Middle scenes
        if (gatilhosPresentes.length === 0) {
          suggestions.push('Adicione pelo menos um gatilho mental nesta cena');
          priority = 'medium';
        }
        if (scene.audio?.voicePresent && !scene.audio?.musicDetected) {
          suggestions.push('Considere adicionar música de fundo para aumentar engajamento');
        }
        copyStrength = 5 + gatilhosPresentes.length;
      }
      
      // Add specific trigger suggestions
      if (!gatilhosPresentes.includes('Prova Social') && scene.id > 1) {
        suggestions.push('Mencione número de clientes satisfeitos ou casos de sucesso');
      }
      if (!gatilhosPresentes.includes('Escassez') && scene.endSec > scenes[0].endSec + 10) {
        suggestions.push('Indique disponibilidade limitada ou prazo da oferta');
      }
      
      return {
        sceneId: scene.id,
        copyStrength: Math.min(10, copyStrength),
        suggestions: suggestions.slice(0, 3),
        detectedElements,
        improvementPriority: priority,
        gatilhosPresentes
      };
    });
  }

  private createPersuasiveTimeline(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    narrative: CopyAnalysisResult['narrative'],
    persuasion: CopyAnalysisResult['persuasion']
  ): CopyAnalysisResult['persuasiveTimeline'] {
    const timeline: CopyAnalysisResult['persuasiveTimeline'] = [];
    
    // Map narrative stages to timeline
    narrative.stages.forEach(stage => {
      if (stage.present) {
        const elements: string[] = [stage.name];
        
        // Find triggers in this time range
        persuasion.examples.forEach(example => {
          if (example.timestamp >= stage.startSec && example.timestamp < stage.endSec) {
            elements.push(example.trigger);
          }
        });
        
        // Determine type based on stage name
        let type: CopyAnalysisResult['persuasiveTimeline'][0]['type'] = 'benefit';
        if (stage.name.toLowerCase().includes('attention')) type = 'hook';
        else if (stage.name.toLowerCase().includes('problem')) type = 'problem';
        else if (stage.name.toLowerCase().includes('agitation')) type = 'agitation';
        else if (stage.name.toLowerCase().includes('solution')) type = 'solution';
        else if (stage.name.toLowerCase().includes('action')) type = 'cta';
        
        // Find CTA in this range
        const scene = scenes.find(s => 
          s.startSec <= stage.startSec && s.endSec >= stage.endSec
        );
        const cta = scene?.audio?.ctas?.[0];
        
        timeline.push({
          startSec: stage.startSec,
          endSec: stage.endSec,
          elements,
          cta,
          strength: elements.length > 2 ? 8 : elements.length > 1 ? 6 : 4,
          type
        });
      }
    });
    
    // Add any CTAs not covered by stages
    scenes.forEach(scene => {
      if (scene.audio?.ctas && scene.audio.ctas.length > 0) {
        const existingEntry = timeline.find(t => 
          t.startSec <= scene.startSec && t.endSec >= scene.endSec
        );
        
        if (!existingEntry) {
          timeline.push({
            startSec: scene.startSec,
            endSec: scene.endSec,
            elements: ['CTA'],
            cta: scene.audio.ctas[0],
            strength: 7,
            type: 'cta'
          });
        }
      }
    });
    
    // Sort by timestamp
    timeline.sort((a, b) => a.startSec - b.startSec);
    
    return timeline;
  }
}