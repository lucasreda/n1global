import { Link } from "wouter";
import { ArrowLeft, Zap, Globe, Shield, Code, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VercelIntegrationDocs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Integração Vercel - N1 Hub
            </h1>
            <p className="text-gray-400">
              Documentação completa da integração para criação de funis com deploy automático
            </p>
          </div>
        </div>

        {/* Overview */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Visão Geral da Integração
            </CardTitle>
            <CardDescription className="text-gray-300">
              A integração N1 Hub + Vercel permite que você crie e faça deploy automático de funis de venda 
              gerados por IA diretamente em sua conta Vercel pessoal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Globe className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-white font-semibold">Deploy Automático</h3>
                  <p className="text-gray-400 text-sm">Funis publicados instantaneamente</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-white font-semibold">Isolamento Total</h3>
                  <p className="text-gray-400 text-sm">Projetos na sua conta pessoal</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Code className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-white font-semibold">IA Integrada</h3>
                  <p className="text-gray-400 text-sm">Conteúdo gerado automaticamente</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Como Funciona */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">1</Badge>
                <div>
                  <h4 className="text-white font-medium">Conecte sua conta Vercel</h4>
                  <p className="text-gray-400 text-sm">Autorize o N1 Hub a criar projetos em sua conta</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">2</Badge>
                <div>
                  <h4 className="text-white font-medium">Configure seu funil</h4>
                  <p className="text-gray-400 text-sm">Defina produto, preço, benefícios e público-alvo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">3</Badge>
                <div>
                  <h4 className="text-white font-medium">IA gera conteúdo</h4>
                  <p className="text-gray-400 text-sm">GPT-4 cria copy persuasiva e otimizada</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">4</Badge>
                <div>
                  <h4 className="text-white font-medium">Deploy automático</h4>
                  <p className="text-gray-400 text-sm">Funil publicado em sua conta Vercel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recursos */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recursos Inclusos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">5 templates otimizados para conversão</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">Geração de conteúdo com IA (GPT-4)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">Deploy automático no Vercel</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">Domínios customizados (suporte Vercel)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">Tracking de conversões integrado</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">Suporte a Facebook Pixel e Google Analytics</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OAuth Details */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="w-5 h-5" />
              Detalhes da Integração OAuth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-white font-semibold mb-3">🔑 Permissões Solicitadas (Scopes OAuth Exatos)</h4>
              <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left p-3 text-white font-semibold">Scope (Nome Canônico)</th>
                      <th className="text-left p-3 text-white font-semibold">Justificativa Específica</th>
                      <th className="text-left p-3 text-white font-semibold">Necessário</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-t border-gray-600/50">
                      <td className="p-3">
                        <Badge className="bg-blue-600 text-white">user</Badge>
                      </td>
                      <td className="p-3 text-gray-300">
                        Identificar conta Vercel, obter nome/email para personalização da UI
                      </td>
                      <td className="p-3 text-green-400">✅ Sim</td>
                    </tr>
                    <tr className="border-t border-gray-600/50">
                      <td className="p-3">
                        <Badge className="bg-green-600 text-white">project:read</Badge>
                      </td>
                      <td className="p-3 text-gray-300">
                        Listar projetos existentes para prevenir conflitos de nome ao criar funis
                      </td>
                      <td className="p-3 text-green-400">✅ Sim</td>
                    </tr>
                    <tr className="border-t border-gray-600/50">
                      <td className="p-3">
                        <Badge className="bg-purple-600 text-white">project:write</Badge>
                      </td>
                      <td className="p-3 text-gray-300">
                        Criar novos projetos de funis e configurar variáveis de ambiente
                      </td>
                      <td className="p-3 text-green-400">✅ Sim</td>
                    </tr>
                    <tr className="border-t border-gray-600/50">
                      <td className="p-3">
                        <Badge className="bg-orange-600 text-white">deploy</Badge>
                      </td>
                      <td className="p-3 text-gray-300">
                        Executar deploys automáticos quando usuário criar/atualizar funis
                      </td>
                      <td className="p-3 text-green-400">✅ Sim</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-sm font-medium">
                  ⚠️ Todos os scopes são obrigatórios para funcionamento da integração
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">🔄 URLs de Callback e Webhooks</h4>
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h5 className="text-green-400 font-medium mb-2">📍 Produção</h5>
                  <code className="text-blue-400 text-sm block mb-1">
                    https://n1hub.com/api/funnels/vercel/callback
                  </code>
                  <p className="text-gray-400 text-xs">URL principal para usuários em produção</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h5 className="text-blue-400 font-medium mb-2">🧪 Desenvolvimento/Staging</h5>
                  <code className="text-blue-400 text-sm block mb-1">
                    https://[domain].replit.dev/api/funnels/vercel/callback
                  </code>
                  <p className="text-gray-400 text-xs">URLs dinâmicas para testes e desenvolvimento</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                  <h5 className="text-orange-400 font-medium mb-2">🔔 Webhook de Desinstalação</h5>
                  <code className="text-blue-400 text-sm block mb-1">
                    https://n1hub.com/api/funnels/vercel/uninstall
                  </code>
                  <p className="text-gray-400 text-xs">Notificação automática quando integração é removida</p>
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg mt-4">
                <h5 className="text-white font-semibold mb-2">📋 URLs para Configuração (Copie e Cole)</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Production Callback:</p>
                    <code className="text-blue-400 bg-gray-900/50 p-1 rounded">https://n1hub.com/api/funnels/vercel/callback</code>
                  </div>
                  <div>
                    <p className="text-gray-400">Development Callback:</p>
                    <code className="text-blue-400 bg-gray-900/50 p-1 rounded">https://[domain].replit.dev/api/funnels/vercel/callback</code>
                  </div>
                  <div>
                    <p className="text-gray-400">Uninstall Webhook:</p>
                    <code className="text-blue-400 bg-gray-900/50 p-1 rounded">https://n1hub.com/api/funnels/vercel/uninstall</code>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">🗂️ Fluxo de Dados Detalhado</h4>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h5 className="text-blue-400 font-semibold mb-2">📖 O que LEMOS da sua conta Vercel:</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>Informações básicas do usuário:</strong> nome, email, ID da conta</li>
                    <li>• <strong>Lista de projetos:</strong> apenas nomes para evitar conflitos</li>
                    <li>• <strong>Configurações de domínio:</strong> para sugestões de URL</li>
                    <li>• <strong>Status de deploys:</strong> para monitorar progresso</li>
                  </ul>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h5 className="text-green-400 font-semibold mb-2">✍️ O que ESCREVEMOS na sua conta Vercel:</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>Novos projetos:</strong> apenas funis que você criar no N1 Hub</li>
                    <li>• <strong>Código dos funis:</strong> HTML/CSS/JS gerados pela nossa IA</li>
                    <li>• <strong>Variáveis de ambiente:</strong> configurações de tracking (se solicitado)</li>
                    <li>• <strong>Deploys:</strong> novas versões quando você atualizar funis</li>
                  </ul>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                  <h5 className="text-purple-400 font-semibold mb-2">🔐 Segurança do Token</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>Criptografia:</strong> AES-256 + chave mestra rotacionada mensalmente</li>
                    <li>• <strong>Armazenamento:</strong> PostgreSQL com TLS + backup criptografado</li>
                    <li>• <strong>Expiração:</strong> Tokens renovados automaticamente (30 dias)</li>
                    <li>• <strong>Acesso:</strong> Apenas sistemas autorizados com audit logs</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">❌ Revogação e Exclusão de Dados</h4>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                  <h5 className="text-red-400 font-medium mb-2">🚫 Revogar Acesso à Vercel</h5>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                    <li>Acesse <a href="https://vercel.com/dashboard/integrations" className="text-blue-400 hover:underline" target="_blank" rel="noopener">vercel.com/dashboard/integrations</a></li>
                    <li>Na aba <strong>"Installed"</strong>, encontre "N1 Hub Funnel Builder"</li>
                    <li>Clique no botão <strong>"Configure"</strong> ao lado da integração</li>
                    <li>Role até o final e clique <strong>"Remove Integration"</strong></li>
                    <li>Confirme clicando <strong>"Remove"</strong> no modal</li>
                  </ol>
                  <p className="text-yellow-300 text-sm mt-2 font-medium">
                    ⚡ Efeito: Acesso revogado instantaneamente, webhook enviado automaticamente para n1hub.com
                  </p>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                  <h5 className="text-orange-400 font-medium mb-2">🗑️ Exclusão de Dados OAuth - SLA Específico</h5>
                  <div className="space-y-3 text-sm">
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                      <h6 className="text-red-300 font-medium mb-2">⚡ SLA de Exclusão OAuth:</h6>
                      <ul className="text-gray-300 text-xs space-y-1">
                        <li>• <strong>Tokens OAuth Vercel:</strong> 4 horas úteis</li>
                        <li>• <strong>Dados de conexão:</strong> 24 horas</li>
                        <li>• <strong>Logs de integração:</strong> 7 dias</li>
                        <li>• <strong>Metadados de projeto:</strong> 24 horas</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-800/50 p-3 rounded">
                      <h6 className="text-white font-medium mb-1">📞 Solicitar Exclusão OAuth:</h6>
                      <p className="text-blue-400"><a href="mailto:oauth-data-deletion@n1hub.com" className="hover:underline">oauth-data-deletion@n1hub.com</a></p>
                      <p className="text-gray-400 text-xs">Assunto: "Exclusão OAuth Vercel - [seu-email-vercel]"</p>
                      <p className="text-gray-400 text-xs mt-1">Resposta em <strong>2 horas úteis</strong> + exclusão conforme SLA</p>
                    </div>

                    <div>
                      <p className="text-yellow-300 font-medium">🔗 Links Importantes:</p>
                      <ul className="text-gray-400 text-xs space-y-1 mt-1">
                        <li>• <Link href="/privacy-policy" className="text-blue-400 hover:underline">Política completa de exclusão de dados</Link></li>
                        <li>• <Link href="/eula" className="text-blue-400 hover:underline">Termos sobre dados e integração</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-2">🔒 Isolamento Completo</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Seus funis são deployados diretamente em SUA conta Vercel pessoal, não na nossa. 
                  Isso garante isolamento total e você mantém controle completo dos seus projetos.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">🛡️ Permissões Limitadas</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Nossa integração só tem acesso para criar e fazer deploy de projetos. 
                  Não conseguimos ler seus dados existentes nem modificar outros projetos.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">🔑 OAuth Seguro</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Utilizamos o protocolo OAuth 2.0 padrão da indústria. 
                  Você pode revogar o acesso a qualquer momento nas configurações da Vercel.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">📊 Transparência Total</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Todos os custos de hospedagem e recursos são da sua conta Vercel. 
                  Não cobramos taxas escondidas de infraestrutura.
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-blue-400 font-semibold mb-2">📋 Conformidade Legal</h4>
              <p className="text-gray-300 text-sm">
                Esta integração está em conformidade com nossos <Link href="/eula" className="text-blue-400 hover:underline">Termos de Uso</Link> e 
                <Link href="/privacy-policy" className="text-blue-400 hover:underline ml-1">Política de Privacidade</Link>. 
                Recomendamos a leitura completa antes de autorizar a integração.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suporte */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Suporte e Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-gray-300">
                Precisa de ajuda com a integração OAuth da Vercel? Nossa equipe especializada está aqui para apoiar você:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2">🔧 Suporte OAuth Monitorado</h4>
                  <p className="text-sm text-gray-400 mb-2">Problemas específicos com integração OAuth</p>
                  <p className="text-blue-400 text-sm font-medium"><a href="mailto:vercel-oauth@n1hub.com" className="hover:underline">vercel-oauth@n1hub.com</a></p>
                  <p className="text-xs text-gray-500">Monitorado 24/7 • Resposta: 1-2 horas úteis</p>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                  <h4 className="text-purple-400 font-semibold mb-2">🔒 Privacidade</h4>
                  <p className="text-sm text-gray-400 mb-3">Exclusão de dados, LGPD, direitos</p>
                  <a href="mailto:privacy@n1hub.com" className="text-purple-400 hover:underline text-sm">privacy@n1hub.com</a>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">💬 Suporte Geral</h4>
                  <p className="text-sm text-gray-400 mb-3">Dúvidas gerais, onboarding</p>
                  <a href="mailto:support@n1hub.com" className="text-green-400 hover:underline text-sm">support@n1hub.com</a>
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-2">⚡ Tempo de Resposta</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• <strong>Suporte técnico:</strong> 4-8 horas úteis</li>
                  <li>• <strong>Privacidade/LGPD:</strong> 15 dias (conforme lei)</li>
                  <li>• <strong>Suporte geral:</strong> 12-24 horas úteis</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/customer-support">
                    Central de Suporte
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}