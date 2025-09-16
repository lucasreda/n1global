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

interface CopywritingFramework {
  name: string;
  description: string;
  stages: string[];
  patterns: string[][];
  indicators: {
    opening: string[];
    transitions: string[];
    closing: string[];
  };
}

interface FrameworkDetectionResult {
  framework: string;
  confidence: number;
  completeness: number;
  stages: Array<{
    name: string;
    startSec: number;
    endSec: number;
    excerpt: string;
    present: boolean;
    strength: number;
  }>;
  reasoning: string;
}

export class DynamicCopyAnalysis {
  private frameworks: CopywritingFramework[] = [
    {
      name: 'AIDA',
      description: 'Attention, Interest, Desire, Action',
      stages: ['Attention', 'Interest', 'Desire', 'Action'],
      patterns: [
        // Attention (PT/IT/EN/ES/FR)
        ['atenção', 'olhe', 'veja', 'descubra', 'attenzione', 'guarda', 'scopri', 'eleganza', 'rifugio', 'inizia', 'attention', 'look', 'see', 'discover', 'atención', 'mira', 've', 'descubre', 'attention', 'regarde', 'vois', 'découvre'],
        // Interest (PT/IT/EN/ES/FR)
        ['interessante', 'benefício', 'vantagem', 'interessante', 'beneficio', 'vantaggio', 'morbido', 'fresco', 'luminoso', 'seta', 'interesting', 'benefit', 'advantage', 'interesante', 'beneficio', 'ventaja', 'intéressant', 'bénéfice', 'avantage'],
        // Desire (PT/IT/EN/ES/FR)
        ['imagine', 'deseja', 'sonha', 'perfeito', 'immagina', 'desidera', 'sogna', 'perfetto', 'elegante', 'delicata', 'completo', 'imagine', 'desire', 'dream', 'perfect', 'imagina', 'desea', 'sueña', 'perfecto', 'imagine', 'désire', 'rêve', 'parfait'],
        // Action (PT/IT/EN/ES/FR)
        ['compre', 'acesse', 'garanta', 'agora', 'compra', 'accedi', 'garantisci', 'ora', 'ordina', 'veloce', 'spedizione', 'buy', 'access', 'guarantee', 'now', 'compra', 'accede', 'garantiza', 'ahora', 'achète', 'accède', 'garantit', 'maintenant']
      ],
      indicators: {
        opening: ['novo', 'descoberta', 'revelação', 'nuovo', 'scoperta', 'rivelazione', 'new', 'discovery', 'revelation'],
        transitions: ['mas', 'então', 'agora', 'ma', 'quindi', 'ora', 'but', 'then', 'now'],
        closing: ['agora', 'hoje', 'limitado', 'ora', 'oggi', 'limitato', 'now', 'today', 'limited']
      }
    },
    {
      name: 'PAS',
      description: 'Problem, Agitation, Solution',
      stages: ['Problem', 'Agitation', 'Solution'],
      patterns: [
        // Problem
        ['problema', 'dificuldade', 'frustrado', 'problema', 'difficoltà', 'frustrato', 'problem', 'difficulty', 'frustrated'],
        // Agitation  
        ['pior', 'terrível', 'consequência', 'peggio', 'terribile', 'conseguenza', 'worse', 'terrible', 'consequence'],
        // Solution
        ['solução', 'resolver', 'eliminar', 'soluzione', 'risolvere', 'eliminare', 'regola', 'temperatura', 'solution', 'solve', 'eliminate']
      ],
      indicators: {
        opening: ['sabe', 'conhece', 'sa', 'conosce', 'know', 'familiar'],
        transitions: ['mas', 'pior ainda', 'ma', 'peggio ancora', 'but', 'even worse'],
        closing: ['finalmente', 'solução', 'finalmente', 'soluzione', 'finally', 'solution']
      }
    },
    {
      name: 'BAB',
      description: 'Before, After, Bridge',
      stages: ['Before', 'After', 'Bridge'],
      patterns: [
        // Before
        ['antes', 'atualmente', 'situação', 'prima', 'attualmente', 'situazione', 'before', 'currently', 'situation'],
        // After
        ['depois', 'resultado', 'transformação', 'dopo', 'risultato', 'trasformazione', 'bellezza', 'italia', 'after', 'result', 'transformation'],
        // Bridge
        ['como', 'método', 'sistema', 'come', 'metodo', 'sistema', 'set', 'unica', 'how', 'method', 'system']
      ],
      indicators: {
        opening: ['imagine', 'pense', 'immagina', 'pensa', 'imagine', 'think'],
        transitions: ['agora', 'mas', 'ora', 'ma', 'now', 'but'],
        closing: ['simples', 'fácil', 'semplice', 'facile', 'simple', 'easy']
      }
    },
    {
      name: 'Story-Brand',
      description: 'Hero\'s Journey for Marketing',
      stages: ['Character', 'Problem', 'Guide', 'Plan', 'Success', 'Failure', 'Transformation'],
      patterns: [
        ['você', 'pessoa', 'tu', 'persona', 'you', 'person'],
        ['problema', 'desafio', 'problema', 'sfida', 'problem', 'challenge'],
        ['especialista', 'experiência', 'esperto', 'esperienza', 'expert', 'experience'],
        ['passo', 'processo', 'passo', 'processo', 'step', 'process'],
        ['sucesso', 'resultado', 'successo', 'risultato', 'success', 'result'],
        ['falhar', 'perder', 'fallire', 'perdere', 'fail', 'lose'],
        ['transformação', 'mudança', 'trasformazione', 'cambiamento', 'transformation', 'change']
      ],
      indicators: {
        opening: ['era uma vez', 'história', 'c\'era una volta', 'storia', 'once upon', 'story'],
        transitions: ['então', 'depois', 'quindi', 'dopo', 'then', 'next'],
        closing: ['final', 'felizes', 'finale', 'felici', 'end', 'happy']
      }
    },
    {
      name: '4Ps',
      description: 'Promise, Picture, Proof, Push',
      stages: ['Promise', 'Picture', 'Proof', 'Push'],
      patterns: [
        ['prometo', 'garanto', 'prometto', 'garantisco', 'promise', 'guarantee'],
        ['imagine', 'visualize', 'immagina', 'visualizza', 'imagine', 'visualize'],
        ['prova', 'evidência', 'prova', 'evidenza', 'proof', 'evidence'],
        ['agora', 'urgente', 'ora', 'urgente', 'now', 'urgent']
      ],
      indicators: {
        opening: ['promessa', 'garantia', 'promessa', 'garanzia', 'promise', 'guarantee'],
        transitions: ['veja', 'comprove', 'vedi', 'dimostra', 'see', 'prove'],
        closing: ['aja', 'agora', 'agisci', 'ora', 'act', 'now']
      }
    },
    {
      name: 'FAB',
      description: 'Features, Advantages, Benefits',
      stages: ['Features', 'Advantages', 'Benefits'],
      patterns: [
        ['característica', 'função', 'caratteristica', 'funzione', 'feature', 'function'],
        ['vantagem', 'superioridade', 'vantaggio', 'superiorità', 'advantage', 'superiority'],
        ['benefício', 'resultado', 'beneficio', 'risultato', 'benefit', 'result']
      ],
      indicators: {
        opening: ['apresentamos', 'temos', 'presentiamo', 'abbiamo', 'presenting', 'we have'],
        transitions: ['isso significa', 'portanto', 'questo significa', 'quindi', 'this means', 'therefore'],
        closing: ['para você', 'seu benefício', 'per te', 'tuo beneficio', 'for you', 'your benefit']
      }
    },
    {
      name: 'PASTOR',
      description: 'Problem, Amplify, Story, Transformation, Offer, Response',
      stages: ['Problem', 'Amplify', 'Story', 'Transformation', 'Offer', 'Response'],
      patterns: [
        ['problema', 'dificuldade', 'problema', 'difficoltà', 'problem', 'difficulty'],
        ['pior', 'amplifica', 'peggio', 'amplifica', 'worse', 'amplify'],
        ['história', 'caso', 'storia', 'caso', 'story', 'case'],
        ['transformação', 'mudança', 'trasformazione', 'cambiamento', 'transformation', 'change'],
        ['oferta', 'produto', 'offerta', 'prodotto', 'offer', 'product'],
        ['resposta', 'ação', 'risposta', 'azione', 'response', 'action']
      ],
      indicators: {
        opening: ['problema comum', 'problema comune', 'common problem'],
        transitions: ['história real', 'storia vera', 'true story'],
        closing: ['responda agora', 'rispondi ora', 'respond now']
      }
    },
    {
      name: 'QUEST',
      description: 'Qualify, Understand, Educate, Stimulate, Transition',
      stages: ['Qualify', 'Understand', 'Educate', 'Stimulate', 'Transition'],
      patterns: [
        ['você é', 'se você', 'tu sei', 'se tu', 'you are', 'if you'],
        ['entendo', 'compreendo', 'capisco', 'comprendo', 'understand', 'comprehend'],
        ['aprenda', 'descubra', 'impara', 'scopri', 'learn', 'discover'],
        ['excitante', 'incrível', 'eccitante', 'incredibile', 'exciting', 'incredible'],
        ['próximo passo', 'prossimo passo', 'next step']
      ],
      indicators: {
        opening: ['para quem', 'per chi', 'for who'],
        transitions: ['deixe explicar', 'lascia che spieghi', 'let me explain'],
        closing: ['próxima etapa', 'prossima tappa', 'next stage']
      }
    }
  ];

  analyzeNarrativeStructure(transcriptData: TranscriptData, scenes: SceneData[]): FrameworkDetectionResult[] {
    const transcript = transcriptData.transcript.toLowerCase();
    const segments = transcriptData.segments;
    const detectedFrameworks: FrameworkDetectionResult[] = [];

    // Analyze each framework
    for (const framework of this.frameworks) {
      const result = this.analyzeFramework(framework, transcript, segments, transcriptData.duration);
      if (result.confidence > 15) { // Only include frameworks with reasonable confidence
        detectedFrameworks.push(result);
      }
    }

    // Sort by confidence and return top results
    const sortedFrameworks = detectedFrameworks.sort((a, b) => b.confidence - a.confidence);
    
    // If no frameworks detected, create generic structure
    if (sortedFrameworks.length === 0) {
      const genericFramework = this.createGenericStructure(transcriptData, segments);
      sortedFrameworks.push(genericFramework);
    }

    console.log(`🎯 Dynamic Copy Analysis: Detected ${sortedFrameworks.length} frameworks`);
    sortedFrameworks.forEach(fw => 
      console.log(`   ${fw.framework}: ${fw.confidence}% confidence, ${fw.completeness}% complete`)
    );

    return sortedFrameworks;
  }

  private analyzeFramework(
    framework: CopywritingFramework, 
    transcript: string, 
    segments: Array<{text: string, start: number, end: number}>, 
    duration: number
  ): FrameworkDetectionResult {
    const stages = framework.stages.map((stageName, stageIndex) => {
      const patterns = framework.patterns[stageIndex] || [];
      let stageFound = false;
      let stageStart = -1;
      let stageEnd = -1;
      let stageExcerpt = '';
      let matchStrength = 0;

      // Check patterns in this stage
      for (const pattern of patterns) {
        const patternIndex = transcript.indexOf(pattern);
        if (patternIndex !== -1) {
          stageFound = true;
          matchStrength += 1;

          // Find segment containing this pattern
          const segment = segments.find(seg => 
            seg.text.toLowerCase().includes(pattern)
          );
          
          if (segment && stageStart === -1) {
            stageStart = segment.start;
            stageEnd = segment.end;
            stageExcerpt = segment.text.substring(0, 80) + '...';
          }
        }
      }

      // Check indicators for additional confidence
      const allIndicators = [
        ...framework.indicators.opening,
        ...framework.indicators.transitions, 
        ...framework.indicators.closing
      ];
      
      for (const indicator of allIndicators) {
        if (transcript.includes(indicator)) {
          matchStrength += 0.5;
        }
      }

      return {
        name: stageName,
        startSec: stageStart !== -1 ? stageStart : stageIndex * (duration / framework.stages.length),
        endSec: stageEnd !== -1 ? stageEnd : (stageIndex + 1) * (duration / framework.stages.length),
        excerpt: stageExcerpt || `[${stageName} - estrutura inferida]`,
        present: stageFound,
        strength: Math.min(10, matchStrength * 2) // Scale to 0-10
      };
    });

    // Calculate metrics
    const presentStages = stages.filter(s => s.present).length;
    const completeness = (presentStages / stages.length) * 100;
    const averageStrength = stages.reduce((sum, s) => sum + s.strength, 0) / stages.length;
    const confidence = Math.min(100, (completeness * 0.6) + (averageStrength * 4)); // Weighted confidence

    // Generate reasoning
    const reasoning = this.generateFrameworkReasoning(framework, stages, confidence, completeness);

    return {
      framework: framework.name,
      confidence: Math.round(confidence),
      completeness: Math.round(completeness), 
      stages,
      reasoning
    };
  }

  private generateFrameworkReasoning(
    framework: CopywritingFramework,
    stages: any[],
    confidence: number,
    completeness: number
  ): string {
    const presentStages = stages.filter(s => s.present);
    const strongStages = stages.filter(s => s.strength >= 5);
    
    let reasoning = `Framework ${framework.name}: `;
    
    if (confidence >= 70) {
      reasoning += `Forte correspondência detectada (${confidence.toFixed(0)}%). `;
    } else if (confidence >= 40) {
      reasoning += `Correspondência moderada (${confidence.toFixed(0)}%). `;
    } else {
      reasoning += `Correspondência fraca (${confidence.toFixed(0)}%). `;
    }

    reasoning += `${presentStages.length}/${stages.length} estágios identificados. `;
    
    if (strongStages.length > 0) {
      reasoning += `Estágios mais fortes: ${strongStages.map(s => s.name).join(', ')}. `;
    }

    if (completeness >= 80) {
      reasoning += `Estrutura narrativa muito bem definida.`;
    } else if (completeness >= 50) {
      reasoning += `Estrutura narrativa moderadamente definida.`;
    } else {
      reasoning += `Estrutura narrativa parcialmente identificada.`;
    }

    return reasoning;
  }

  private createGenericStructure(
    transcriptData: TranscriptData, 
    segments: Array<{text: string, start: number, end: number}>
  ): FrameworkDetectionResult {
    const duration = transcriptData.duration;
    const stages = [
      {
        name: 'Abertura',
        startSec: 0,
        endSec: duration * 0.3,
        excerpt: segments.slice(0, 1).map(s => s.text).join(' ').substring(0, 80) + '...',
        present: segments.length > 0,
        strength: 3
      },
      {
        name: 'Desenvolvimento',
        startSec: duration * 0.3,
        endSec: duration * 0.7,
        excerpt: segments.slice(1, -1).map(s => s.text).join(' ').substring(0, 80) + '...',
        present: segments.length > 1,
        strength: 3
      },
      {
        name: 'Fechamento',
        startSec: duration * 0.7,
        endSec: duration,
        excerpt: segments.slice(-1).map(s => s.text).join(' ').substring(0, 80) + '...',
        present: segments.length > 0,
        strength: 3
      }
    ];

    const completeness = (stages.filter(s => s.present).length / stages.length) * 100;

    return {
      framework: 'Estrutura Genérica',
      confidence: 30,
      completeness: Math.round(completeness),
      stages,
      reasoning: `Estrutura narrativa genérica baseada na progressão temporal do vídeo. ${stages.filter(s => s.present).length}/3 seções identificadas com conteúdo relevante.`
    };
  }
}