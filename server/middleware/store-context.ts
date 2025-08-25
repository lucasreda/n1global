import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, stores } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Request type to include storeId
declare global {
  namespace Express {
    interface Request {
      storeId?: string;
      userRole?: string;
    }
  }
}

export async function storeContext(req: Request, res: Response, next: NextFunction) {
  try {
    // Get user from JWT (set by auth middleware)
    const user = (req as any).user;
    
    if (!user) {
      return next();
    }

    console.log(`🔍 Store context for user ${user.id}, role: ${user.role}, storeId: ${user.storeId}`);
    req.userRole = user.role;

    if (user.role === 'store') {
      // For store owners, find their store
      const [userStore] = await db
        .select({ storeId: stores.id })
        .from(stores)
        .where(eq(stores.ownerId, user.id))
        .limit(1);

      if (userStore) {
        req.storeId = userStore.storeId;
        console.log(`✅ Store owner storeId: ${req.storeId}`);
      }
    } else if (user.role === 'product_seller') {
      // For product sellers, use their linked store
      const [userRecord] = await db
        .select({ storeId: users.storeId })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (userRecord?.storeId) {
        req.storeId = userRecord.storeId;
        console.log(`✅ Product seller storeId: ${req.storeId}`);
      }
    }

    // Fallback: try to use storeId from user object if available
    if (!req.storeId && user.storeId) {
      req.storeId = user.storeId;
      console.log(`✅ Fallback storeId from user: ${req.storeId}`);
    }

    console.log(`🎯 Final storeId for request: ${req.storeId}`);
    next();
  } catch (error) {
    console.error('❌ Store context middleware error:', error);
    next(error);
  }
}