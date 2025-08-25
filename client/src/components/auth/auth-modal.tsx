import { useState } from "react";
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
import { BarChart3, Mail, Lock, User, ArrowRight, Sparkles, TrendingUp } from "lucide-react";

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
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
        className="max-w-4xl h-[600px] p-0 border-0 bg-transparent shadow-none overflow-hidden"
        data-testid="modal-auth"
      >
        <div className="flex h-full">
          {/* Left Side - Brand & Visual */}
          <div className="flex-1 relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 p-8 flex flex-col justify-between">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-32 right-16 w-16 h-16 bg-white rounded-full animate-pulse delay-700"></div>
              <div className="absolute bottom-20 left-20 w-12 h-12 bg-white rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-32 right-12 w-8 h-8 bg-white rounded-full animate-pulse delay-500"></div>
            </div>
            
            {/* Brand Header */}
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">COD Dashboard</h1>
                  <p className="text-blue-100 text-sm">Analytics & Performance</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Transforme seus dados em{" "}
                  <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                    insights poderosos
                  </span>
                </h2>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Dashboard completo para gestão de vendas COD, análise de métricas e integração com transportadoras.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-sm">Métricas em tempo real</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-sm">Integração com Facebook Ads</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-sm">Controle total de custos</span>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 bg-white dark:bg-gray-900 p-8 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <DialogHeader className="text-center mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {isLoginMode ? "Bem-vindo de volta" : "Criar sua conta"}
                </DialogTitle>
                <p className="text-gray-600 dark:text-gray-300">
                  {isLoginMode ? "Entre com suas credenciais para continuar" : "Comece sua jornada analytics hoje"}
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="seu@email.com"
                                className="pl-11 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                                data-testid="input-password"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 group"
                        disabled={loginForm.formState.isSubmitting}
                        data-testid="button-login"
                      >
                        <span>{loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}</span>
                        {!loginForm.formState.isSubmitting && (
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                        )}
                      </Button>
                    </div>
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Nome Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="Seu nome"
                                className="pl-11 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="seu@email.com"
                                className="pl-11 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
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
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                                data-testid="input-password-register"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 group"
                        disabled={registerForm.formState.isSubmitting}
                        data-testid="button-register"
                      >
                        <span>{registerForm.formState.isSubmitting ? "Criando..." : "Criar Conta"}</span>
                        {!registerForm.formState.isSubmitting && (
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-center text-gray-600 dark:text-gray-400">
                  {isLoginMode ? "Novo por aqui?" : "Já tem conta?"}{" "}
                  <button
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
                    data-testid="button-toggle-auth"
                  >
                    {isLoginMode ? "Criar conta" : "Fazer login"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
