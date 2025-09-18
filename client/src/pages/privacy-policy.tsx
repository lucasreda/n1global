import { Link } from "wouter";
import { ArrowLeft, Shield, Eye, Database, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
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
              <Shield className="w-8 h-8" />
              Política de Privacidade - N1 Hub
            </h1>
            <p className="text-gray-400">
              Como coletamos, usamos e protegemos seus dados - Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Resumo de Privacidade */}
        <Card className="bg-green-500/10 border-green-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Resumo da Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-green-400 font-semibold mb-2">🔒 Dados que coletamos:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Informações de conta (nome, email)</li>
                  <li>• Dados dos funis que você cria</li>
                  <li>• Tokens OAuth (criptografados)</li>
                  <li>• Logs de uso básicos</li>
                </ul>
              </div>
              <div>
                <h4 className="text-red-400 font-semibold mb-2">❌ Não coletamos:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Dados pessoais desnecessários</li>
                  <li>• Informações bancárias</li>
                  <li>• Conteúdo dos seus projetos Vercel</li>
                  <li>• Dados de navegação detalhados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seções da Política */}
        <div className="space-y-8">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">1. Informações que Coletamos</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Dados Pessoais
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Nome completo</li>
                    <li>• Endereço de email</li>
                    <li>• Informações da conta</li>
                    <li>• Preferências de configuração</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Dados de Uso
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Funis criados e configurações</li>
                    <li>• Templates utilizados</li>
                    <li>• Histórico de deploys</li>
                    <li>• Logs de acesso básicos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">2. Como Usamos seus Dados</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Usamos suas informações exclusivamente para fornecer e melhorar nossos serviços:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2">Operação do Serviço:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Autenticação e autorização</li>
                    <li>• Criação e deploy de funis</li>
                    <li>• Integração com Vercel</li>
                    <li>• Suporte técnico</li>
                  </ul>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">Melhoria do Produto:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Análise de performance</li>
                    <li>• Correção de bugs</li>
                    <li>• Otimização de recursos</li>
                    <li>• Desenvolvimento de features</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">3. Integração com Terceiros</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Nossa plataforma se integra com serviços terceiros para funcionar adequadamente:
              </p>
              <div className="space-y-4">
                <div className="bg-gray-500/10 border border-gray-500/20 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">Vercel</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Para deploy automático de funis em sua conta pessoal.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Dados compartilhados: Token OAuth, configurações de projeto</li>
                    <li>• Política: <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:underline">vercel.com/legal/privacy-policy</a></li>
                  </ul>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/20 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">OpenAI</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Para geração de conteúdo dos funis via IA.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Dados compartilhados: Informações do produto, prompts de geração</li>
                    <li>• Política: <a href="https://openai.com/privacy" className="text-blue-400 hover:underline">openai.com/privacy</a></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="w-5 h-5" />
                4. Segurança dos Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Implementamos múltiplas camadas de segurança para proteger suas informações:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">🔐 Criptografia</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• HTTPS/TLS para todas as comunicações</li>
                    <li>• Tokens OAuth criptografados no banco</li>
                    <li>• Senhas com hash bcrypt</li>
                  </ul>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2">🛡️ Acesso</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Autenticação JWT com expiração</li>
                    <li>• Isolamento por operação/usuário</li>
                    <li>• Logs de acesso monitored</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">5. Controlador de Dados</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">📋 Empresa Responsável</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Razão Social:</strong> N1 Hub Tecnologia LTDA</p>
                  <p><strong>CNPJ:</strong> 12.345.678/0001-90</p>
                  <p><strong>Endereço:</strong> Rua das Startups, 123 - São Paulo, SP - CEP 01234-567</p>
                  <p><strong>Email do DPO:</strong> dpo@n1hub.com</p>
                  <p><strong>Contato Geral:</strong> legal@n1hub.com</p>
                </div>
              </div>
              <p className="text-sm">
                A N1 Hub Tecnologia LTDA atua como controladora dos dados pessoais coletados através desta plataforma, 
                sendo responsável pelas decisões sobre tratamento conforme a LGPD.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">6. Seus Direitos LGPD/GDPR</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>Você possui os seguintes direitos fundamentais sobre seus dados:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-green-400 font-semibold mb-3">✅ Direitos Garantidos:</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-500/10 rounded">
                      <strong className="text-green-300">Acesso:</strong>
                      <p className="text-xs text-gray-400">Obter cópia de todos os seus dados que processamos</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded">
                      <strong className="text-blue-300">Retificação:</strong>
                      <p className="text-xs text-gray-400">Corrigir informações incorretas ou desatualizadas</p>
                    </div>
                    <div className="p-2 bg-red-500/10 rounded">
                      <strong className="text-red-300">Exclusão:</strong>
                      <p className="text-xs text-gray-400">Apagar permanentemente todos os seus dados</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded">
                      <strong className="text-purple-300">Portabilidade:</strong>
                      <p className="text-xs text-gray-400">Exportar dados em formato estruturado</p>
                    </div>
                    <div className="p-2 bg-orange-500/10 rounded">
                      <strong className="text-orange-300">Revogação:</strong>
                      <p className="text-xs text-gray-400">Retirar consentimento para tratamentos específicos</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-blue-400 font-semibold mb-3">📝 Como Solicitar:</h4>
                  <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
                    <div>
                      <h5 className="text-white font-medium">1. Através da Plataforma</h5>
                      <p className="text-sm text-gray-400">Configurações → Privacidade → Solicitar Dados</p>
                    </div>
                    <div>
                      <h5 className="text-white font-medium">2. Email Direto</h5>
                      <p className="text-sm text-gray-400">
                        <a href="mailto:privacy@n1hub.com" className="text-blue-400 hover:underline">privacy@n1hub.com</a>
                      </p>
                    </div>
                    <div>
                      <h5 className="text-white font-medium">3. Prazos Específicos de Resposta</h5>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>• <strong>Confirmação recebimento:</strong> 2 dias úteis</p>
                        <p>• <strong>Resposta completa:</strong> 15 dias (LGPD) / 30 dias (GDPR)</p>
                        <p>• <strong>Casos complexos:</strong> Extensão de até 15 dias (com notificação)</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-white font-medium">4. Verificação</h5>
                      <p className="text-sm text-gray-400">Pode ser necessário confirmar identidade por segurança</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-2">⚖️ Autoridade de Proteção</h4>
                <p className="text-sm">
                  Se não ficar satisfeito com nossa resposta, você pode registrar uma reclamação junto à 
                  <strong> ANPD (Autoridade Nacional de Proteção de Dados)</strong> através de 
                  <a href="https://www.gov.br/anpd" className="text-blue-400 hover:underline ml-1">www.gov.br/anpd</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">7. Retenção e Exclusão de Dados</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">📅 Períodos de Retenção</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Dados da conta:</strong> Enquanto conta ativa + 6 meses após inativação</li>
                    <li><strong>Funis e projetos:</strong> Enquanto conta ativa + 90 dias</li>
                    <li><strong>Logs de segurança:</strong> 12 meses por conformidade legal</li>
                    <li><strong>Tokens OAuth:</strong> Expiram automaticamente (30 dias)</li>
                    <li><strong>Cookies de sessão:</strong> 24 horas ou logout</li>
                  </ul>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                  <h4 className="text-red-400 font-semibold mb-2">🗑️ Exclusão Automática</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Solicitação manual:</strong> 15 dias úteis</li>
                    <li><strong>Conta inativa:</strong> Após 24 meses sem login</li>
                    <li><strong>Dados temporários:</strong> 30 dias</li>
                    <li><strong>Backups seguros:</strong> 90 dias após exclusão primária</li>
                  </ul>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">🔄 Processo de Exclusão Completa</h4>
                <p className="text-sm mb-2">Quando você solicita exclusão dos dados:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                  <li>Dados principais removidos imediatamente da produção</li>
                  <li>Backups de segurança limpos em até 30 dias</li>
                  <li>Logs anônimos mantidos apenas para auditoria (sem identificação pessoal)</li>
                  <li>Confirmação de conclusão enviada por email</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">8. Transferências Internacionais</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                <h4 className="text-orange-400 font-semibold mb-2">🌍 Países e Bases Legais</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-white">Estados Unidos:</strong>
                    <p className="text-gray-400">OpenAI (GPT-4) - Adequação GDPR Art. 45 + Contratos de Transferência</p>
                  </div>
                  <div>
                    <strong className="text-white">Estados Unidos:</strong>
                    <p className="text-gray-400">Vercel (infraestrutura) - EU-US Data Privacy Framework</p>
                  </div>
                  <div>
                    <strong className="text-white">União Europeia:</strong>
                    <p className="text-gray-400">Serviços de backup e CDN - Decisão de adequação</p>
                  </div>
                </div>
              </div>
              <p className="text-sm">
                <strong>Medidas de Proteção:</strong> Todas as transferências internacionais são protegidas por 
                contratos de transferência de dados aprovados pela ANPD/GDPR, criptografia em trânsito e em repouso, 
                e monitoramento contínuo de segurança.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">9. Lista Oficial de Subprocessadores</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4">
                <p className="text-blue-300 font-medium text-sm mb-2">📋 Subprocessadores Autorizados (LGPD Art. 16)</p>
                <p className="text-xs text-gray-400">
                  Lista completa de terceiros que processam dados pessoais em nosso nome. 
                  Alterações são notificadas com 30 dias de antecedência.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                  <h4 className="text-purple-400 font-semibold mb-2">🤖 Inteligência Artificial</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-white">OpenAI LLC</strong>
                      <p className="text-gray-400">Geração de conteúdo para funis</p>
                      <a href="https://openai.com/privacy" className="text-blue-400 hover:underline">Política de Privacidade</a>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">☁️ Infraestrutura</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-white">Vercel Inc.</strong>
                      <p className="text-gray-400">Deploy e hospedagem de funis</p>
                      <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:underline">Política de Privacidade</a>
                    </div>
                    <div>
                      <strong className="text-white">Replit</strong>
                      <p className="text-gray-400">Hospedagem da plataforma principal</p>
                      <a href="https://replit.com/privacy" className="text-blue-400 hover:underline">Política de Privacidade</a>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2">📧 Comunicação</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-white">SendGrid/Twilio</strong>
                      <p className="text-gray-400">Envio de emails transacionais</p>
                      <a href="https://www.twilio.com/legal/privacy" className="text-blue-400 hover:underline">Política de Privacidade</a>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                  <h4 className="text-yellow-400 font-semibold mb-2">🔒 Segurança</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-white">Neon Database</strong>
                      <p className="text-gray-400">Armazenamento seguro de dados</p>
                      <a href="https://neon.tech/privacy-policy" className="text-blue-400 hover:underline">Política de Privacidade</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-2">📋 Contratos e Garantias</h4>
                <p className="text-sm text-gray-400">
                  Todos os subprocessadores possuem:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-400 ml-4">
                  <li>• Contratos de Processamento de Dados (DPA) assinados</li>
                  <li>• Certificações de segurança (ISO 27001, SOC 2, etc.)</li>
                  <li>• Auditorias regulares de conformidade</li>
                  <li>• Obrigação de notificar violações em 24h</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">10. Proteção de Menores (Children's Privacy)</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <h4 className="text-red-400 font-semibold mb-2">🔞 Política de Idade Mínima</h4>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    <strong>Este serviço NÃO é destinado a menores de 16 anos conforme GDPR/LGPD.</strong>
                  </p>
                  <p>• <strong>Idade mínima:</strong> 16 anos (GDPR) / 18 anos (Brasil - maioridade civil)</p>
                  <p>• <strong>Verificação obrigatória:</strong> Data de nascimento coletada no cadastro</p>
                  <p>• <strong>Rejeição automática:</strong> Contas de menores bloqueadas no registro</p>
                  <p>• <strong>Sem consentimento parental:</strong> Não coletamos dados de menores mesmo com autorização</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">🚨 Procedimento se Detectarmos Menor</h4>
                <div className="space-y-2 text-sm">
                  <h5 className="text-white font-medium">Ação Imediata (0-4 horas):</h5>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Suspensão imediata da conta</li>
                    <li>Bloqueio de acesso a todos os serviços</li>
                    <li>Início do processo de exclusão de dados</li>
                  </ol>
                  
                  <h5 className="text-white font-medium mt-3">Exclusão Completa (24-48h):</h5>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Remoção de dados pessoais do banco principal</li>
                    <li>Purga de backups e logs com identificação</li>
                    <li>Notificação de conclusão aos responsáveis</li>
                    <li>Relatório à ANPD (se aplicável)</li>
                  </ol>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-2">📞 Canal de Denúncia Prioritário</h4>
                <div className="text-sm">
                  <p className="mb-2">Suspeita de menor usando o serviço? Contate imediatamente:</p>
                  <p className="text-white font-medium">📧 <a href="mailto:child-protection@n1hub.com" className="text-blue-400 hover:underline">child-protection@n1hub.com</a></p>
                  <p className="text-gray-400 text-xs">Resposta garantida: <strong>2 horas úteis</strong> • Investigação: <strong>24 horas</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">7. Cookies e Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>Usamos cookies mínimos necessários para o funcionamento:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2"></div>
                  <div>
                    <h4 className="text-white font-medium">Cookies Essenciais</h4>
                    <p className="text-sm text-gray-400">Autenticação JWT, sessão do usuário</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                  <div>
                    <h4 className="text-white font-medium">Cookies de Preferência</h4>
                    <p className="text-sm text-gray-400">Configurações de interface, idioma</p>
                  </div>
                </div>
              </div>
              <p className="text-sm bg-red-500/10 border border-red-500/20 p-3 rounded">
                <strong>Não usamos:</strong> Cookies de tracking, analytics invasivos ou publicidade.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">8. Alterações na Política</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Esta política pode ser atualizada para refletir mudanças nos nossos serviços ou 
                regulamentações legais.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">Processo de Atualização:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Notificação por email para mudanças significativas</li>
                  <li>• Aviso na plataforma por 30 dias</li>
                  <li>• Histórico de versões disponível</li>
                  <li>• Data de última atualização sempre visível</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">9. Contato</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Para questões sobre privacidade, proteção de dados ou exercer seus direitos:
              </p>
              <div className="flex gap-4 mt-4">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/customer-support">
                    Central de Suporte
                  </Link>
                </Button>
                <Button variant="outline">
                  <a href="mailto:privacy@n1hub.com" className="text-white">
                    privacy@n1hub.com
                  </a>
                </Button>
              </div>
              <div className="text-sm text-gray-400 mt-4">
                <p><strong>Encarregado de Dados (DPO):</strong> privacy@n1hub.com</p>
                <p><strong>Resposta:</strong> Até 30 dias conforme LGPD/GDPR</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm text-center">
            Esta política de privacidade é efetiva a partir de {new Date().toLocaleDateString('pt-BR')} e 
            está em conformidade com a LGPD (Lei Geral de Proteção de Dados) e GDPR.
          </p>
        </div>
      </div>
    </div>
  );
}