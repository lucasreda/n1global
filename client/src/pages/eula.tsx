import { Link } from "wouter";
import { ArrowLeft, Scale, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EULA() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <Scale className="w-8 h-8" />
              Termos de Uso - N1 Hub
            </h1>
            <p className="text-gray-400">
              End User License Agreement (EULA) - Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Resumo */}
        <Card className="bg-blue-500/10 border-blue-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Resumo dos Termos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-blue-400 font-semibold mb-2">✅ Você pode:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Usar o N1 Hub para criar funis de venda</li>
                  <li>• Conectar sua conta Vercel pessoal</li>
                  <li>• Fazer deploy de funis ilimitados</li>
                  <li>• Usar os funis para fins comerciais</li>
                </ul>
              </div>
              <div>
                <h4 className="text-red-400 font-semibold mb-2">❌ Você não pode:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Revender ou redistribuir a plataforma</li>
                  <li>• Usar para atividades ilegais</li>
                  <li>• Violar termos de terceiros (Vercel, OpenAI)</li>
                  <li>• Tentar quebrar sistemas de segurança</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termos Completos */}
        <div className="space-y-8">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">1. Aceitação dos Termos</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Ao usar o N1 Hub e sua integração com Vercel, você concorda em cumprir estes termos de uso. 
                Se você não concorda com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
              <p>
                Estes termos podem ser atualizados periodicamente. Continuará sendo sua responsabilidade 
                revisar os termos regularmente.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">2. Licença de Uso</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Concedemos a você uma licença não exclusiva, não transferível e revogável para usar 
                o N1 Hub de acordo com estes termos.
              </p>
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2">Direitos Concedidos:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Criar funis de venda ilimitados</li>
                  <li>• Usar templates e conteúdo gerado por IA</li>
                  <li>• Deploy automático em sua conta Vercel</li>
                  <li>• Uso comercial dos funis criados</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">3. Integração Vercel</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Nossa integração com Vercel permite deploy automático de seus funis. Importante entender:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2">Seu Controle:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Funis deployados em SUA conta</li>
                    <li>• Você paga custos de hospedagem</li>
                    <li>• Controle total sobre domínios</li>
                    <li>• Pode revogar acesso a qualquer momento</li>
                  </ul>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                  <h4 className="text-purple-400 font-semibold mb-2">Nossa Responsabilidade:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Gerar conteúdo via IA</li>
                    <li>• Automatizar processo de deploy</li>
                    <li>• Manter integração funcionando</li>
                    <li>• Suporte técnico da plataforma</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">4. Limitações e Responsabilidades</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-yellow-400 font-semibold">Importante:</h4>
                </div>
                <ul className="space-y-2 text-sm">
                  <li>• Não nos responsabilizamos por custos da Vercel em sua conta</li>
                  <li>• Conteúdo gerado por IA pode precisar de revisão e edição</li>
                  <li>• Você é responsável pelo conteúdo final dos seus funis</li>
                  <li>• Deve cumprir leis locais e regulamentações de marketing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">5. Condições de Uso Aceitável</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>Você concorda em NÃO usar o N1 Hub para:</p>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <ul className="space-y-1 text-sm">
                  <li>• Atividades ilegais ou fraudulentas</li>
                  <li>• Spam, phishing ou atividades maliciosas</li>
                  <li>• Violação de direitos autorais ou propriedade intelectual</li>
                  <li>• Conteúdo ofensivo, discriminatório ou prejudicial</li>
                  <li>• Tentativas de quebrar sistemas de segurança</li>
                  <li>• Sobrecarregar nossa infraestrutura</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">6. Propriedade Intelectual</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Os funis e conteúdo gerado através do N1 Hub pertencem a você. 
                Nós mantemos propriedade sobre:
              </p>
              <ul className="space-y-1 text-sm ml-4">
                <li>• A plataforma N1 Hub</li>
                <li>• Templates e código base</li>
                <li>• Algoritmos e IA proprietária</li>
                <li>• Marca e identidade visual</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">7. Cancelamento e Término</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Você pode cancelar sua conta N1 Hub a qualquer momento. Funis já deployados 
                em sua conta Vercel permanecem sob seu controle.
              </p>
              <p>
                Nos reservamos o direito de suspender contas que violem estes termos, 
                mas forneceremos aviso prévio quando possível.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">8. Contato e Suporte</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Para questões sobre estes termos ou suporte técnico:
              </p>
              <div className="flex gap-4 mt-4">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/customer-support">
                    Central de Suporte
                  </Link>
                </Button>
                <Button variant="outline">
                  <a href="mailto:legal@n1hub.com" className="text-white">
                    legal@n1hub.com
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm text-center">
            Estes termos são efetivos a partir de {new Date().toLocaleDateString('pt-BR')} e 
            substituem todos os acordos anteriores.
          </p>
        </div>
      </div>
    </div>
  );
}