import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, Copy, Trash2, MoreVertical, FileText, Calendar } from "lucide-react";
import { useLocation } from "wouter";

interface FunnelPage {
  id: string;
  funnelId: string;
  name: string;
  slug: string;
  pageType: string;
  status: 'draft' | 'published' | 'archived';
  order: number;
  model: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface PageCardProps {
  page: FunnelPage;
  funnelId: string;
  onDelete: () => void;
  onDuplicate: () => void;
  getPageTypeLabel: (type: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  isDeleting: boolean;
  isDuplicating: boolean;
}

export function PageCard({
  page,
  funnelId,
  onDelete,
  onDuplicate,
  getPageTypeLabel,
  getStatusColor,
  getStatusLabel,
  isDeleting,
  isDuplicating
}: PageCardProps) {
  const [, setLocation] = useLocation();

  const handleEdit = () => {
    setLocation(`/funnels/${funnelId}/pages/${page.id}/edit`);
  };

  const handlePreview = () => {
    setLocation(`/funnels/${funnelId}/pages/${page.id}/preview`);
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700 hover:border-gray-600 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-base truncate" data-testid={`text-page-name-${page.id}`}>
              {page.name}
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              {page.path}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-page-menu-${page.id}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit} data-testid={`action-edit-${page.id}`}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePreview} data-testid={`action-preview-${page.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDuplicate}
                disabled={isDuplicating}
                data-testid={`action-duplicate-${page.id}`}
              >
                <Copy className="w-4 h-4 mr-2" />
                {isDuplicating ? 'Duplicando...' : 'Duplicar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={isDeleting}
                className="text-red-400 focus:text-red-300"
                data-testid={`action-delete-${page.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deletando...' : 'Deletar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Page Type and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {getPageTypeLabel(page.pageType)}
            </Badge>
            <Badge className={`${getStatusColor(page.status)} text-white text-xs`}>
              {getStatusLabel(page.status)}
            </Badge>
          </div>

          {/* Page Preview */}
          <div className="bg-gray-800/50 rounded-md p-3 min-h-[80px] flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Atualizada em {new Date(page.updatedAt).toLocaleDateString('pt-BR')}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1 bg-transparent border-gray-600 hover:bg-gray-700"
              data-testid={`button-edit-${page.id}`}
            >
              <Edit className="w-3 h-3 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="flex-1 bg-transparent border-gray-600 hover:bg-gray-700"
              data-testid={`button-preview-${page.id}`}
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}