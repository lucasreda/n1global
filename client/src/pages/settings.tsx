import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { User, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  const settingSections = [
    {
      title: "Perfil do Usuário",
      description: "Gerencie informações pessoais e preferências",
      icon: User,
      items: ["Dados pessoais", "Alterar senha", "Foto de perfil"]
    },
    {
      title: "Notificações",
      description: "Configure alertas e notificações do sistema",
      icon: Bell,
      items: ["Email notifications", "Push notifications", "SMS alerts"]
    },
    {
      title: "Segurança",
      description: "Configurações de segurança e autenticação",
      icon: Shield,
      items: ["Autenticação 2FA", "Sessões ativas", "Logs de acesso"]
    },
    {
      title: "Sistema",
      description: "Configurações gerais do dashboard",
      icon: Database,
      items: ["Backup automático", "Tema da interface", "Idioma"]
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Configurações do Sistema" 
        subtitle="Personalize e configure suas preferências" 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingSections.map((section) => (
          <div key={section.title} className="glassmorphism rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <section.icon className="text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="text-white font-semibold">{section.title}</h3>
                <p className="text-gray-400 text-sm">{section.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item} className="glassmorphism-light rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer">
                  <span className="text-gray-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="glassmorphism rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Sobre o Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium">Versão</h4>
            <p className="text-gray-400 text-sm">v1.0.0</p>
          </div>
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium">Última Atualização</h4>
            <p className="text-gray-400 text-sm">15/12/2024</p>
          </div>
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium">Suporte</h4>
            <p className="text-gray-400 text-sm">24/7 Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
