import { db } from '../db';
import { userOperationAccess, operations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface TeamPermissions {
  dashboard?: {
    view?: boolean;
    export?: boolean;
  };
  orders?: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  products?: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  ads?: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  integrations?: {
    view?: boolean;
    edit?: boolean;
  };
  settings?: {
    view?: boolean;
    edit?: boolean;
  };
  team?: {
    view?: boolean;
    invite?: boolean;
    manage?: boolean;
  };
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, TeamPermissions> = {
  owner: {
    dashboard: { view: true, export: true },
    orders: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true },
    ads: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, edit: true },
    settings: { view: true, edit: true },
    team: { view: true, invite: true, manage: true },
  },
  admin: {
    dashboard: { view: true, export: true },
    orders: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    ads: { view: true, create: true, edit: true, delete: false },
    integrations: { view: true, edit: true },
    settings: { view: true, edit: true },
    team: { view: true, invite: true, manage: true },
  },
  viewer: {
    dashboard: { view: true, export: false },
    orders: { view: true, create: false, edit: false, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    ads: { view: true, create: false, edit: false, delete: false },
    integrations: { view: true, edit: false },
    settings: { view: true, edit: false },
    team: { view: true, invite: false, manage: false },
  },
};

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: string): TeamPermissions {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.viewer;
}

/**
 * Merge custom permissions with default permissions
 */
export function mergePermissions(
  defaultPermissions: TeamPermissions,
  customPermissions?: TeamPermissions | null
): TeamPermissions {
  if (!customPermissions) {
    return defaultPermissions;
  }

  const merged: TeamPermissions = { ...defaultPermissions };

  for (const module in customPermissions) {
    if (merged[module as keyof TeamPermissions]) {
      merged[module as keyof TeamPermissions] = {
        ...merged[module as keyof TeamPermissions],
        ...customPermissions[module as keyof TeamPermissions],
      };
    } else {
      merged[module as keyof TeamPermissions] = customPermissions[module as keyof TeamPermissions];
    }
  }

  return merged;
}

/**
 * Check if user has permission for a specific module and action
 */
export async function hasPermission(
  userId: string,
  operationId: string,
  module: keyof TeamPermissions,
  action: string
): Promise<boolean> {
  // Super admins have all permissions
  const [user] = await db
    .select()
    .from(userOperationAccess)
    .where(
      and(
        eq(userOperationAccess.userId, userId),
        eq(userOperationAccess.operationId, operationId)
      )
    )
    .limit(1);

  if (!user) {
    return false;
  }

  // Get user's role from userOperationAccess
  const role = user.role;
  
  // Check if user is owner (owners have all permissions)
  if (role === 'owner') {
    return true;
  }

  // Get default permissions for role
  const defaultPermissions = getDefaultPermissions(role);
  
  // Merge with custom permissions
  const permissions = mergePermissions(
    defaultPermissions,
    user.permissions as TeamPermissions | null
  );

  // Check permission
  const modulePermissions = permissions[module];
  if (!modulePermissions) {
    return false;
  }

  return (modulePermissions as any)[action] === true;
}

/**
 * Check if user can manage team (invite/remove members)
 */
export async function canManageTeam(userId: string, operationId: string): Promise<boolean> {
  return hasPermission(userId, operationId, 'team', 'manage');
}

/**
 * Check if user can invite team members
 */
export async function canInviteTeam(userId: string, operationId: string): Promise<boolean> {
  return hasPermission(userId, operationId, 'team', 'invite');
}

/**
 * Get user's effective permissions for an operation
 */
export async function getUserPermissions(
  userId: string,
  operationId: string
): Promise<TeamPermissions> {
  const [access] = await db
    .select()
    .from(userOperationAccess)
    .where(
      and(
        eq(userOperationAccess.userId, userId),
        eq(userOperationAccess.operationId, operationId)
      )
    )
    .limit(1);

  if (!access) {
    return {};
  }

  const defaultPermissions = getDefaultPermissions(access.role);
  return mergePermissions(defaultPermissions, access.permissions as TeamPermissions | null);
}

/**
 * Validate permissions structure
 */
export function validatePermissions(permissions: any): boolean {
  if (!permissions || typeof permissions !== 'object') {
    return false;
  }

  const validModules = ['dashboard', 'orders', 'products', 'ads', 'integrations', 'settings', 'team'];
  
  for (const module in permissions) {
    if (!validModules.includes(module)) {
      return false;
    }

    const modulePerms = permissions[module];
    if (typeof modulePerms !== 'object') {
      return false;
    }

    // Validate actions based on module
    for (const action in modulePerms) {
      if (typeof modulePerms[action] !== 'boolean') {
        return false;
      }
    }
  }

  return true;
}

