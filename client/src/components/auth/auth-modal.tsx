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
        className="glassmorphism border-0 shadow-2xl max-w-md"
        data-testid="modal-auth"
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-bold text-white mb-2">
            {isLoginMode ? "Bem-vindo" : "Criar Conta"}
          </DialogTitle>
          <p className="text-gray-300">
            {isLoginMode ? "Acesse seu dashboard COD" : "Configure seu acesso ao dashboard"}
          </p>
        </DialogHeader>

        {isLoginMode ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-200">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="seu@email.com"
                        className="glassmorphism-light border-gray-600/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-email"
                      />
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
                    <FormLabel className="text-sm font-medium text-gray-200">Senha</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="glassmorphism-light border-gray-600/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full gradient-blue hover:opacity-90 font-semibold py-3 transition-all transform hover:scale-105 shadow-lg"
                disabled={loginForm.formState.isSubmitting}
                data-testid="button-login"
              >
                {loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-200">Nome Completo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Seu nome"
                        className="glassmorphism-light border-gray-600/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-name"
                      />
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
                    <FormLabel className="text-sm font-medium text-gray-200">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="seu@email.com"
                        className="glassmorphism-light border-gray-600/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-email-register"
                      />
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
                    <FormLabel className="text-sm font-medium text-gray-200">Senha</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="glassmorphism-light border-gray-600/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-password-register"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full gradient-success hover:opacity-90 font-semibold py-3 transition-all transform hover:scale-105 shadow-lg"
                disabled={registerForm.formState.isSubmitting}
                data-testid="button-register"
              >
                {registerForm.formState.isSubmitting ? "Criando..." : "Criar Conta"}
              </Button>
            </form>
          </Form>
        )}

        <p className="text-center text-gray-300">
          {isLoginMode ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-blue-400 hover:text-blue-300 font-medium"
            data-testid="button-toggle-auth"
          >
            {isLoginMode ? "Registre-se" : "Fazer login"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
