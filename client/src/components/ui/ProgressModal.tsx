import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Image as ImageIcon, 
  Palette, 
  Sparkles, 
  CheckCircle, 
  Loader2,
  Clock,
  Zap
} from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Brain;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  duration?: number;
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose?: () => void;
  steps: ProgressStep[];
  currentStepIndex: number;
  overallProgress: number;
  title?: string;
  subtitle?: string;
}

const defaultSteps: ProgressStep[] = [
  {
    id: 'analyze',
    title: 'Analisando Brief',
    description: 'Processando informações do produto e mercado',
    icon: Brain,
    status: 'pending'
  },
  {
    id: 'content',
    title: 'Gerando Conteúdo',
    description: 'Criando textos persuasivos e estrutura',
    icon: Sparkles,
    status: 'pending'
  },
  {
    id: 'design',
    title: 'Definindo Design',
    description: 'Aplicando paleta de cores e tipografia',
    icon: Palette,
    status: 'pending'
  },
  {
    id: 'media',
    title: 'Criando Imagens IA',
    description: 'Gerando imagens profissionais com DALL-E',
    icon: ImageIcon,
    status: 'pending'
  },
  {
    id: 'optimize',
    title: 'Otimizando Qualidade',
    description: 'Aplicando gates de qualidade visual',
    icon: Zap,
    status: 'pending'
  }
];

export default function ProgressModal({
  isOpen,
  onClose,
  steps = defaultSteps,
  currentStepIndex,
  overallProgress,
  title = 'Gerando Página com IA',
  subtitle = 'Criando uma experiência premium para o seu produto'
}: ProgressModalProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setAnimatedProgress(overallProgress);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [overallProgress, isOpen]);

  const getStatusIcon = (step: ProgressStep) => {
    const IconComponent = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'error':
        return <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>;
      default:
        return <IconComponent className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepStatusColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'running':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg shadow-blue-500/20';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop com glassmorphism */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg mx-auto"
          >
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-hidden">
              
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {subtitle}
                  </p>
                </motion.div>

                {/* Overall Progress Bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mt-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progresso Geral
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {Math.round(animatedProgress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${animatedProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Steps */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index + 0.3 }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${getStepStatusColor(step)}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Step Icon */}
                        <motion.div
                          animate={step.status === 'running' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex-shrink-0 mt-1"
                        >
                          {getStatusIcon(step)}
                        </motion.div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {step.title}
                            </h3>
                            {step.status === 'running' && (
                              <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3 text-blue-500" />
                                {step.duration && (
                                  <span className="text-xs text-blue-500">
                                    ~{step.duration}s
                                  </span>
                                )}
                              </motion.div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {step.description}
                          </p>

                          {/* Individual Step Progress */}
                          {step.status === 'running' && step.progress !== undefined && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2"
                            >
                              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-blue-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${step.progress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gerando página com qualidade premium...</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}