import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";

export interface AuthRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 Auth Debug:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    url: req.url,
    method: req.method
  });

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log("❌ JWT verification failed:", err.message);
      return res.status(403).json({ message: "Token inválido" });
    }
    console.log("✅ JWT verified for user:", user.email);
    req.user = user;
    next();
  });
};

// Middleware to verify JWT token from header OR query parameter (for SSE)
export const authenticateTokenOrQuery = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  
  // If no token in header, check query parameter
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  console.log("🔐 SSE Auth Debug:", {
    hasAuthHeader: !!authHeader,
    hasQueryToken: !!req.query.token,
    hasToken: !!token,
    url: req.url,
    method: req.method
  });

  if (!token) {
    console.log("❌ No token provided (header or query)");
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log("❌ JWT verification failed:", err.message);
      return res.status(403).json({ message: "Token inválido" });
    }
    console.log("✅ JWT verified for user (SSE):", user.email);
    req.user = user;
    next();
  });
};

// Middleware to require specific role(s)
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      console.log(`❌ Access denied: user role '${userRole}' not in [${allowedRoles.join(', ')}]`);
      return res.status(403).json({ 
        message: "Acesso negado: você não tem permissão para acessar este recurso" 
      });
    }

    console.log(`✅ Role check passed: ${userRole}`);
    next();
  };
};

// Specific guards for different roles
export const requireSuperAdmin = requireRole('super_admin');
export const requireAdmin = requireRole('super_admin', 'admin_financeiro', 'admin_investimento');
export const requireStore = requireRole('store');
export const requireAffiliate = requireRole('affiliate');
export const requireInvestor = requireRole('investor');
export const requireSupplier = requireRole('supplier');

// Combined guards for flexibility
export const requireAdminOrStore = requireRole('super_admin', 'admin_financeiro', 'admin_investimento', 'store');
export const requireAffiliateOrAdmin = requireRole('affiliate', 'super_admin', 'admin_financeiro');