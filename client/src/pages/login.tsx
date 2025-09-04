import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, Check, X } from "lucide-react";
import logoPath from "@assets/logo_1756142152045.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres")
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  email: z.string()
    .email("Email inválido")
    .min(5, "Email deve ter no mínimo 5 caracteres")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const { login, register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  };

  const fullText = "Descomplicando suas vendas por todo o mundo.";

  // Typewriting effect
  useEffect(() => {
    setDisplayedText("");
    setShowCursor(true);
    let currentIndex = 0;
    
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        // Hide cursor after a small delay
        setTimeout(() => {
          setShowCursor(false);
        }, 500);
      }
    }, 80); // Typing speed (80ms per character)

    return () => clearInterval(typewriterInterval);
  }, [fullText]);

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
      confirmPassword: "",
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
      // Always create user accounts as "user" role
      await register(data.name, data.email, data.password, "user");
      
      // Always redirect to main dashboard for user accounts
      setLocation('/');
      
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

  const handleBackToHome = () => {
    console.log('Redirecionando para home...');
    setLocation('/');
  };

  return (
    <div className="min-h-screen w-full relative bg-background">
      {/* Background gradient and blur effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-chart-1/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-chart-2/20 rounded-full blur-3xl"></div>
      </div>

      {/* Logo - Top Left on Desktop, Hidden on Mobile */}
      <div className="absolute top-6 left-6 z-10 hidden lg:block">
        <button 
          onClick={handleBackToHome}
          className="hover:opacity-80 transition-opacity"
          data-testid="button-back-home"
        >
          <img src={logoPath} alt="Logo" className="h-8 w-auto" />
        </button>
      </div>

      {/* Close Button - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={handleBackToHome}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/10 rounded-full"
          data-testid="button-close-auth"
        >
          <X className="h-5 w-5" />
        </button>
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
                  {showCursor && <span className="animate-pulse text-primary">|</span>}
                </h1>
                <p className={`text-xl text-muted-foreground leading-relaxed max-w-lg transition-opacity duration-500 ${
                  displayedText === fullText ? 'opacity-100' : 'opacity-0'
                }`}>
                  Gerencie seus pedidos, analise métricas em tempo real e integre com as principais plataformas de vendas.
                </p>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl lg:flex-shrink-0 p-4">
              {/* Mobile Logo - Centered at Top */}
              <div className="flex justify-center mb-8 lg:hidden">
                <button 
                  onClick={handleBackToHome}
                  className="hover:opacity-80 transition-opacity"
                  data-testid="button-back-home-mobile"
                >
                  <img src={logoPath} alt="Logo" className="h-8 w-auto" />
                </button>
              </div>

              {/* Auth Card */}
              <div className="glassmorphism rounded-2xl p-8 backdrop-blur-xl">
                <div className="text-center mb-4 mt-4">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    {isLoginMode ? "Bem-vindo" : "Criar Conta"}
                  </h2>
                  <p className="text-muted-foreground">
                    {isLoginMode ? "Acesse seu Dashboard" : "Configure seu acesso ao dashboard"}
                  </p>
                </div>

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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...registerForm.register("name")}
                        placeholder="Seu nome"
                        className="pl-10 h-12"
                        data-testid="input-name"
                      />
                    </div>
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...registerForm.register("email")}
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 h-12"
                        data-testid="input-email-register"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
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
                              id="password"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 h-12 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-white/10 transition-all duration-200 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
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
                        
                        {/* Password Strength Indicator */}
                        {field.value && (
                          <div className="mt-2 space-y-2">
                            <div className="flex space-x-1">
                              {Array.from({length: 4}).map((_, i) => {
                                const { score } = checkPasswordStrength(field.value);
                                return (
                                  <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                                      i < score 
                                        ? score === 1 ? 'bg-red-500' 
                                          : score === 2 ? 'bg-orange-500'
                                          : score === 3 ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {Object.entries(checkPasswordStrength(field.value).checks).map(([key, valid]) => (
                                <div key={key} className={`flex items-center space-x-1.5 ${valid ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                                  {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  <span>
                                    {key === 'length' ? '8+ caracteres' :
                                     key === 'lowercase' ? 'Minúscula' :
                                     key === 'uppercase' ? 'Maiúscula' :
                                     'Número'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirmPassword"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="bg-white/5 border border-white/10 rounded-xl pl-10 h-12 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-white/10 transition-all duration-200 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                              data-testid="input-confirm-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
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
  );
}