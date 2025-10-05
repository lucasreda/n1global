import express from "express";
import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  products,
  affiliateMemberships,
  affiliateProfiles,
  operations,
  type Product,
  type AffiliateMembership,
} from "@shared/schema";
import { authenticateToken, requireAffiliate } from "./auth-middleware";

const router = express.Router();

/**
 * GET /api/affiliate/marketplace/products
 * List all available products in the marketplace for affiliates to join
 * Protected - Affiliate role required
 */
router.get("/products", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get affiliate profile
    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    // Get all active products with their operation info
    const productsWithStatus = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        price: products.price,
        type: products.type,
        operationId: products.operationId,
        operationName: operations.name,
        isActive: products.isActive,
      })
      .from(products)
      .leftJoin(operations, eq(products.operationId, operations.id))
      .where(eq(products.isActive, true));

    // Get existing memberships for this affiliate
    const existingMemberships = await db
      .select()
      .from(affiliateMemberships)
      .where(eq(affiliateMemberships.affiliateId, affiliateProfile.id));

    // Create a map of productId -> membership status
    const membershipMap = new Map<string, string>();
    existingMemberships.forEach((membership) => {
      if (membership.productId) {
        membershipMap.set(membership.productId, membership.status);
      }
    });

    // Enhance products with membership status
    const enhancedProducts = productsWithStatus.map((product) => ({
      ...product,
      membershipStatus: membershipMap.get(product.id) || null,
      canJoin: !membershipMap.has(product.id),
    }));

    res.json(enhancedProducts);
  } catch (error: any) {
    console.error("Error fetching marketplace products:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/affiliate/marketplace/join/:productId
 * Request to join a product as an affiliate (creates pending membership)
 * Protected - Affiliate role required
 */
router.post("/join/:productId", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // Get affiliate profile
    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    // Check if affiliate is approved
    if (affiliateProfile.status !== "approved") {
      return res.status(403).json({ 
        message: "Seu perfil de afiliado precisa estar aprovado para solicitar produtos" 
      });
    }

    // Check if product exists and is active
    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (productResult.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const product = productResult[0];

    if (!product.isActive) {
      return res.status(400).json({ message: "Este produto não está disponível no momento" });
    }

    if (!product.operationId) {
      return res.status(400).json({ message: "Produto sem operação vinculada" });
    }

    // Check if membership already exists
    const existingMembership = await db
      .select()
      .from(affiliateMemberships)
      .where(
        and(
          eq(affiliateMemberships.affiliateId, affiliateProfile.id),
          eq(affiliateMemberships.productId, productId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return res.status(400).json({ 
        message: `Você já possui uma solicitação para este produto com status: ${existingMembership[0].status}` 
      });
    }

    // Create pending membership
    const newMembership = await db
      .insert(affiliateMemberships)
      .values({
        affiliateId: affiliateProfile.id,
        operationId: product.operationId,
        productId: productId,
        status: "pending",
      })
      .returning();

    res.status(201).json({
      message: "Solicitação de afiliação enviada com sucesso!",
      membership: newMembership[0],
    });
  } catch (error: any) {
    console.error("Error requesting product membership:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/affiliate/marketplace/my-products
 * List products the affiliate has joined (all statuses)
 * Protected - Affiliate role required
 */
router.get("/my-products", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get affiliate profile
    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    // Get memberships with product details
    const myProducts = await db
      .select({
        membershipId: affiliateMemberships.id,
        membershipStatus: affiliateMemberships.status,
        customCommissionPercent: affiliateMemberships.customCommissionPercent,
        approvedAt: affiliateMemberships.approvedAt,
        createdAt: affiliateMemberships.createdAt,
        productId: products.id,
        productName: products.name,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        productPrice: products.price,
        operationName: operations.name,
      })
      .from(affiliateMemberships)
      .innerJoin(products, eq(affiliateMemberships.productId, products.id))
      .leftJoin(operations, eq(affiliateMemberships.operationId, operations.id))
      .where(eq(affiliateMemberships.affiliateId, affiliateProfile.id))
      .orderBy(sql`${affiliateMemberships.createdAt} DESC`);

    res.json(myProducts);
  } catch (error: any) {
    console.error("Error fetching affiliate products:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
