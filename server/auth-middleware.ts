import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";

interface AuthRequest extends Request {
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