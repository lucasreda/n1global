import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userOperationAccess } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Extend Request type to include operationId validation
declare global {
  namespace Express {
    interface Request {
      validatedOperationId?: string;
    }
  }
}

/**
 * Middleware to validate user access to a specific operation
 * Use this on routes that include operationId in params
 */
export async function validateOperationAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    
    // Check for operationId in params, query, or body
    const operationId = req.params.operationId || req.query.operationId || req.body.operationId;

    if (!user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!operationId) {
      return res.status(400).json({ message: "Operation ID é obrigatório" });
    }

    console.log(`🔐 Validating access for user ${user.id} to operation ${operationId}`);

    // Super admins have access to all operations
    if (user.role === 'super_admin' || user.role === 'admin') {
      req.validatedOperationId = operationId;
      console.log(`✅ Admin access granted for operation ${operationId}`);
      return next();
    }

    // Check if user has access to this operation
    const [access] = await db
      .select({ operationId: userOperationAccess.operationId })
      .from(userOperationAccess)
      .where(
        and(
          eq(userOperationAccess.userId, user.id),
          eq(userOperationAccess.operationId, operationId)
        )
      )
      .limit(1);

    if (!access) {
      console.log(`❌ Access denied for user ${user.id} to operation ${operationId}`);
      return res.status(403).json({ 
        message: "Acesso negado: você não tem permissão para acessar esta operação",
        operationId 
      });
    }

    req.validatedOperationId = operationId;
    console.log(`✅ Operation access validated for user ${user.id} to operation ${operationId}`);
    next();
  } catch (error) {
    console.error('❌ Operation access validation error:', error);
    return res.status(500).json({ 
      message: "Erro interno ao validar acesso à operação" 
    });
  }
}