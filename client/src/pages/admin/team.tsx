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
    <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nossa Equipe</h1>
            <p className="text-gray-400 text-sm">
              Conheça os profissionais que fazem a diferença
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Carregando equipe...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {departments.map(department => {
              const departmentUsers = getUsersByDepartment(department.roles);
              const Icon = department.icon;

              return (
                <div key={department.id} className="space-y-4">
                  {/* Department Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                    <span className="text-2xl">{department.emoji}</span>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">
                        {department.name}
                      </h2>
                      <span className="text-sm text-gray-500">
                        ({departmentUsers.length})
                      </span>
                    </div>
                  </div>

                  {/* Team Members Grid */}
                  {departmentUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {departmentUsers.map(user => (
                        <Card 
                          key={user.id}
                          className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
                          data-testid={`card-team-member-${user.id}`}
                        >
                          <div className="p-6 text-center space-y-4">
                            {/* Avatar */}
                            <div className="flex justify-center">
                              <Avatar className="h-20 w-20 border-2 border-white/20">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xl font-bold">
                                  {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            </div>

                            {/* Info */}
                            <div className="space-y-1">
                              <h3 className="text-white font-semibold text-lg" data-testid={`text-member-name-${user.id}`}>
                                {user.name}
                              </h3>
                              <p className="text-gray-400 text-sm" data-testid={`text-member-role-${user.id}`}>
                                {roleLabels[user.role] || user.role}
                              </p>
                              <p className="text-gray-500 text-xs" data-testid={`text-member-email-${user.id}`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Nenhum membro nesta área ainda
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {!isLoading && internalUsers.length > 0 && (
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              Total de <span className="text-white font-semibold">{internalUsers.length}</span> {internalUsers.length === 1 ? 'membro' : 'membros'} na equipe
            </p>
          </div>
        )}
      </div>
  );
}
