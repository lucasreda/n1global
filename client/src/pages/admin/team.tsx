import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, 
  Package, 
  DollarSign, 
  Target, 
  Wrench, 
  Headphones,
  Users,
  Scale
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  icon: any;
  roles: string[];
  emoji: string;
}

const departments: Department[] = [
  {
    id: 'admin',
    name: 'Administração/Liderança',
    icon: Building2,
    roles: ['super_admin', 'admin_investimento'],
    emoji: '💼'
  },
  {
    id: 'hr_legal',
    name: 'Recursos Humanos e Jurídico',
    icon: Scale,
    roles: ['hr', 'legal', 'hr_manager'],
    emoji: '⚖️'
  },
  {
    id: 'operations',
    name: 'Operações/Fulfillment',
    icon: Package,
    roles: ['supplier'],
    emoji: '📦'
  },
  {
    id: 'finance',
    name: 'Financeiro',
    icon: DollarSign,
    roles: ['admin_financeiro'],
    emoji: '💰'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: Target,
    roles: ['marketing'],
    emoji: '🎯'
  },
  {
    id: 'tech',
    name: 'Tecnologia',
    icon: Wrench,
    roles: ['tech', 'developer'],
    emoji: '🛠️'
  },
  {
    id: 'support',
    name: 'Suporte/Atendimento',
    icon: Headphones,
    roles: ['support', 'customer_service'],
    emoji: '🎧'
  }
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super Administrador',
  admin_investimento: 'Administrador de Investimentos',
  admin_financeiro: 'Administrador Financeiro',
  hr: 'Recursos Humanos',
  legal: 'Jurídico',
  hr_manager: 'Gerente de RH',
  supplier: 'Fornecedor/Operações',
  marketing: 'Marketing',
  tech: 'Tecnologia',
  developer: 'Desenvolvedor',
  support: 'Suporte',
  customer_service: 'Atendimento ao Cliente'
};

export default function TeamPage() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  // Filter only internal staff (exclude store, customer, investor, affiliate, product_seller)
  const internalUsers = users.filter(user => 
    !['store', 'product_seller', 'investor', 'affiliate'].includes(user.role)
  );

  const getUsersByDepartment = (departmentRoles: string[]) => {
    return internalUsers.filter(user => departmentRoles.includes(user.role));
  };

  return (
    <div className="p-8 space-y-10">
        {/* Hero Header */}
        <div className="text-center space-y-4 pb-8 border-b border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-2">
            <Users className="h-8 w-8 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Nossa Equipe</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Juntos construímos mais do que produtos — criamos experiências que transformam vidas
            </p>
            {!isLoading && internalUsers.length > 0 && (
              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{internalUsers.length}</div>
                  <div className="text-sm text-gray-400">Membros</div>
                </div>
                <div className="h-12 w-px bg-white/10"></div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{departments.length}</div>
                  <div className="text-sm text-gray-400">Áreas</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Carregando equipe...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {departments.map(department => {
              const departmentUsers = getUsersByDepartment(department.roles);
              const Icon = department.icon;

              return (
                <div key={department.id} className="space-y-6">
                  {/* Department Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white">
                        {department.name}
                      </h2>
                    </div>
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <span className="text-sm text-gray-400">
                        {departmentUsers.length} {departmentUsers.length === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>
                  </div>

                  {/* Team Members Grid */}
                  {departmentUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {departmentUsers.map(user => (
                        <Card 
                          key={user.id}
                          className="group bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
                          data-testid={`card-team-member-${user.id}`}
                        >
                          <div className="p-6 text-center space-y-5">
                            {/* Avatar */}
                            <div className="flex justify-center">
                              <div className="relative">
                                <Avatar className="h-24 w-24 border-2 border-white/20 group-hover:border-purple-400/50 transition-all duration-500">
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-bold group-hover:from-purple-400 group-hover:to-blue-400 transition-all duration-500">
                                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                </div>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-2">
                              <h3 className="text-white font-semibold text-lg leading-tight" data-testid={`text-member-name-${user.id}`}>
                                {user.name}
                              </h3>
                              <div className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
                                <p className="text-purple-300 text-xs font-medium" data-testid={`text-member-role-${user.id}`}>
                                  {roleLabels[user.role] || user.role}
                                </p>
                              </div>
                              <p className="text-gray-400 text-xs" data-testid={`text-member-email-${user.id}`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/5 rounded-lg border border-dashed border-white/10">
                      <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        Nenhum membro nesta área ainda
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
