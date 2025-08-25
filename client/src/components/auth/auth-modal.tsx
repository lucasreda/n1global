import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import logoPath from "@assets/logo_1756142152045.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

interface AuthModalProps {
  isOpen: boolean;
}

export function AuthModal({ isOpen }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const fullText = "Descomplicando suas vendas por todo o mundo.";

  // Typewriting effect
  useEffect(() => {
    if (!isOpen) return;
    
    setDisplayedText("");
    let currentIndex = 0;
    
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
      }
    }, 80); // Velocidade da digitação (80ms por caractere)

    return () => clearInterval(typewriterInterval);
  }, [isOpen, fullText]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      
      // Get user role from localStorage after successful login
      const userData = localStorage.getItem("user");
      const userRole = userData ? JSON.parse(userData).role : null;
      
      // Redirect based on user role after successful login
      if (userRole === 'super_admin') {
        setLocation('/inside');
      } else if (userRole === 'supplier') {
        setLocation('/supplier');
      } else {
        setLocation('/');
      }
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao COD Dashboard",
      });
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Credenciais inválidas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    try {
      await register(data.name, data.email, data.password);
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao COD Dashboard",
      });
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Não foi possível criar a conta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 border-0 bg-transparent shadow-none overflow-hidden m-0"
        data-testid="modal-auth"
      >
        {/* Full screen background */}
        <div className="min-h-screen w-full relative bg-background">
          {/* Background gradient and blur effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background"></div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-chart-1/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-chart-2/20 rounded-full blur-3xl"></div>
          </div>

          {/* Logo - Top Left */}
          <div className="absolute top-6 left-6 z-10">
            <img src={logoPath} alt="Logo" className="h-8 w-auto" />
          </div>

          {/* Main Content - Desktop Split Layout */}
          <div className="relative z-10 min-h-screen flex items-center justify-center">
            <div className="w-full max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center min-h-screen lg:min-h-auto">
                
                {/* Left Side - Title (Desktop Only) */}
                <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:px-12">
                  <div className="text-left">
                    <h1 className="text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 min-h-[200px] xl:min-h-[240px]">
                      {displayedText.split(" ").map((word, index) => (
                        <span key={index}>
                          {word === "vendas" ? (
                            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                              {word}
                            </span>
                          ) : (
                            word
                          )}
                          {index < displayedText.split(" ").length - 1 && " "}
                        </span>
                      ))}
                      <span className="animate-pulse text-primary">|</span>
                    </h1>
                    <p className={`text-xl text-muted-foreground leading-relaxed max-w-lg transition-opacity duration-500 ${
                      displayedText === fullText ? 'opacity-100' : 'opacity-0'
                    }`}>
                      Gerencie seus pedidos COD, analise métricas em tempo real e integre com as principais plataformas de vendas.
                    </p>
                  </div>
                </div>

                {/* Right Side - Auth Form */}
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl lg:flex-shrink-0 p-4">
                  {/* Auth Card */}
                  <div className="glassmorphism rounded-2xl p-8 backdrop-blur-xl">
                    <DialogHeader className="text-center mb-8">
                      <DialogTitle className="text-3xl font-bold text-foreground mb-2">
                        {isLoginMode ? "Bem-vindo" : "Criar Conta"}
                      </DialogTitle>
                      <p className="text-muted-foreground">
                        {isLoginMode ? "Acesse seu dashboard COD" : "Configure seu acesso ao dashboard"}
                      </p>
                    </DialogHeader>

                {isLoginMode ? (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="seu@email.com"
                                  className="glassmorphism-light pl-10 h-12 text-foreground placeholder-muted-foreground border-border focus:border-primary transition-colors"
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="glassmorphism-light pl-10 pr-10 h-12 text-foreground placeholder-muted-foreground border-border focus:border-primary transition-colors"
                                  data-testid="input-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02]"
                        disabled={loginForm.formState.isSubmitting}
                        data-testid="button-login"
                      >
                        {loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">Nome Completo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  placeholder="Seu nome"
                                  className="glassmorphism-light pl-10 h-12 text-foreground placeholder-muted-foreground border-border focus:border-primary transition-colors"
                                  data-testid="input-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="seu@email.com"
                                  className="glassmorphism-light pl-10 h-12 text-foreground placeholder-muted-foreground border-border focus:border-primary transition-colors"
                                  data-testid="input-email-register"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="glassmorphism-light pl-10 pr-10 h-12 text-foreground placeholder-muted-foreground border-border focus:border-primary transition-colors"
                                  data-testid="input-password-register"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full h-12 bg-chart-2 hover:bg-chart-2/90 text-primary-foreground font-semibold transition-all duration-200 transform hover:scale-[1.02]"
                        disabled={registerForm.formState.isSubmitting}
                        data-testid="button-register"
                      >
                        {registerForm.formState.isSubmitting ? "Criando..." : "Criar Conta"}
                      </Button>
                    </form>
                  </Form>
                )}

                    <div className="mt-8 pt-6 border-t border-border">
                      <p className="text-center text-muted-foreground">
                        {isLoginMode ? "Novo por aqui?" : "Já tem conta?"}{" "}
                        <button
                          onClick={() => setIsLoginMode(!isLoginMode)}
                          className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                          data-testid="button-toggle-auth"
                        >
                          {isLoginMode ? "Criar conta" : "Fazer login"}
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
