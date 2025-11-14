import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userOperationAccess, operations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

export interface PermissionCheck {
  module: string;
  action: string;
}

export interface Permissions {
  dashboard?: { view?: boolean; export?: boolean };
  orders?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  products?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  ads?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  integrations?: { view?: boolean; edit?: boolean };
  settings?: { view?: boolean; edit?: boolean };
  team?: { view?: boolean; invite?: boolean; manage?: boolean };
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  operationId: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    // Super admins have all permissions
    const [userAccess] = await db
      .select({
        role: userOperationAccess.role,
        permissions: userOperationAccess.permissions,
      })
      .from(userOperationAccess)
      .where(
        and(
          eq(userOperationAccess.userId, userId),
          eq(userOperationAccess.operationId, operationId)
        )
      )
      .limit(1);

    if (!userAccess) {
      return false;
    }

    // Owners and admins have all permissions by default
    if (userAccess.role === 'owner' || userAccess.role === 'admin') {
      return true;
    }

    // Check granular permissions
    const permissions = userAccess.permissions as Permissions | null;
    if (!permissions) {
      // Viewer role without specific permissions has view-only access
      const hasViewAccess = action === 'view';
      if (!hasViewAccess) {
        console.log(`[Permission Check] Permissões não configuradas para usuário ${userId}, ação ${action} requerida mas apenas 'view' permitido`);
      }
      return hasViewAccess;
    }

    const modulePermissions = permissions[module as keyof Permissions];
    if (!modulePermissions) {
      console.log(`[Permission Check] Módulo ${module} não encontrado nas permissões do usuário ${userId}`);
      return false;
    }

    const hasPermission = modulePermissions[action as keyof typeof modulePermissions] === true;
    if (!hasPermission) {
      console.log(`[Permission Check] Ação ${action} não permitida no módulo ${module} para usuário ${userId}`);
    }
    return hasPermission;
  } catch (error) {
    console.error(`[Permission Check] Erro ao verificar permissão ${module}.${action} para usuário ${userId}:`, error);
    return false;
  }
}

/**
 * Middleware factory to require a specific permission
 * Usage: requirePermission('orders', 'edit')
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      // Get operationId from params, query, or body
      const operationId = req.params.operationId || req.query.operationId || req.body.operationId;

      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Super admins have all permissions
      if (user.role === 'super_admin' || user.role === 'admin') {
        return next();
      }

      if (!operationId) {
        console.log(`[Permission Check] Operation ID não encontrado para módulo ${module}, ação ${action}`);
        return res.status(400).json({ message: "Operation ID é obrigatório" });
      }

      const hasAccess = await hasPermission(user.id, operationId, module, action);

      if (!hasAccess) {
        console.log(`[Permission Check] Acesso negado: usuário ${user.id} não tem permissão ${module}.${action} para operação ${operationId}`);
        return res.status(403).json({ 
          message: `Acesso negado: você não tem permissão para ${action} em ${module}` 
        });
      }

      console.log(`[Permission Check] Permissão concedida: usuário ${user.id} tem permissão ${module}.${action} para operação ${operationId}`);
      next();
    } catch (error) {
      console.error(`[Permission Check] Erro ao verificar permissão ${module}.${action}:`, error);
      return res.status(500).json({ 
        message: "Erro interno ao validar permissões" 
      });
    }
  };
}

/**
 * Middleware to require team management permissions (owner or admin)
 */
export async function requireTeamManagementPermission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    const operationId = req.params.operationId;

    if (!user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!operationId) {
      return res.status(400).json({ message: "Operation ID é obrigatório" });
    }

    // Super admins have access
    if (user.role === 'super_admin' || user.role === 'admin') {
      return next();
    }

    // Check if user is owner or admin of the operation
    const [access] = await db
      .select({ role: userOperationAccess.role })
      .from(userOperationAccess)
      .where(
        and(
          eq(userOperationAccess.userId, user.id),
          eq(userOperationAccess.operationId, operationId)
        )
      )
      .limit(1);

    if (!access) {
      return res.status(403).json({ 
        message: "Acesso negado: você não tem permissão para gerenciar esta equipe" 
      });
    }

    if (access.role !== 'owner' && access.role !== 'admin') {
      return res.status(403).json({ 
        message: "Acesso negado: apenas owners e admins podem gerenciar a equipe" 
      });
    }

    next();
  } catch (error) {
    console.error('Team management permission check error:', error);
    return res.status(500).json({ 
      message: "Erro interno ao validar permissões de equipe" 
    });
  }
}

/**
 * Helper to get default permissions based on role
 */
export function getDefaultPermissions(role: string): Permissions {
  if (role === 'owner' || role === 'admin') {
    // Owners and admins have all permissions
    return {
      dashboard: { view: true, export: true },
      orders: { view: true, create: true, edit: true, delete: true },
      products: { view: true, create: true, edit: true, delete: true },
      ads: { view: true, create: true, edit: true, delete: true },
      integrations: { view: true, edit: true },
      settings: { view: true, edit: true },
      team: { view: true, invite: true, manage: true },
    };
  }

  // Viewer has view-only permissions
  return {
    dashboard: { view: true, export: false },
    orders: { view: true, create: false, edit: false, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    ads: { view: true, create: false, edit: false, delete: false },
    integrations: { view: true, edit: false },
    settings: { view: true, edit: false },
    team: { view: true, invite: false, manage: false },
  };
}
