import express from "express";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  affiliateProductPixels,
  affiliateProfiles,
  products,
  affiliateLandingPages,
  insertAffiliateProductPixelSchema,
  type AffiliateProductPixel,
} from "@shared/schema";
import { authenticateToken, requireAffiliate } from "./auth-middleware";
import { PixelCodeGenerator } from "./pixel-code-generator";

const router = express.Router();

router.get("/products/:productId", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const pixels = await db
      .select()
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.affiliateId, affiliateProfile.id),
          eq(affiliateProductPixels.productId, productId)
        )
      );

    res.json(pixels);
  } catch (error: any) {
    console.error("Error fetching product pixels:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/landing-pages/:landingPageId", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { landingPageId } = req.params;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const pixels = await db
      .select()
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.affiliateId, affiliateProfile.id),
          eq(affiliateProductPixels.landingPageId, landingPageId)
        )
      );

    res.json(pixels);
  } catch (error: any) {
    console.error("Error fetching landing page pixels:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const validation = insertAffiliateProductPixelSchema.safeParse({
      ...req.body,
      affiliateId: affiliateProfile.id,
    });

    if (!validation.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: validation.error.errors,
      });
    }

    const productExists = await db
      .select()
      .from(products)
      .where(eq(products.id, validation.data.productId))
      .limit(1);

    if (productExists.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    if (validation.data.landingPageId) {
      const landingPageExists = await db
        .select()
        .from(affiliateLandingPages)
        .where(eq(affiliateLandingPages.id, validation.data.landingPageId))
        .limit(1);

      if (landingPageExists.length === 0) {
        return res.status(404).json({ message: "Landing page não encontrada" });
      }
    }

    const [newPixel] = await db
      .insert(affiliateProductPixels)
      .values([validation.data])
      .returning();

    res.status(201).json(newPixel);
  } catch (error: any) {
    console.error("Error creating pixel:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:pixelId", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { pixelId } = req.params;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const existingPixel = await db
      .select()
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.id, pixelId),
          eq(affiliateProductPixels.affiliateId, affiliateProfile.id)
        )
      )
      .limit(1);

    if (existingPixel.length === 0) {
      return res.status(404).json({ message: "Pixel não encontrado" });
    }

    const [updatedPixel] = await db
      .update(affiliateProductPixels)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProductPixels.id, pixelId))
      .returning();

    res.json(updatedPixel);
  } catch (error: any) {
    console.error("Error updating pixel:", error);
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:pixelId", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { pixelId } = req.params;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const existingPixel = await db
      .select()
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.id, pixelId),
          eq(affiliateProductPixels.affiliateId, affiliateProfile.id)
        )
      )
      .limit(1);

    if (existingPixel.length === 0) {
      return res.status(404).json({ message: "Pixel não encontrado" });
    }

    await db
      .delete(affiliateProductPixels)
      .where(eq(affiliateProductPixels.id, pixelId));

    res.json({ message: "Pixel excluído com sucesso" });
  } catch (error: any) {
    console.error("Error deleting pixel:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/:pixelId/preview", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { pixelId } = req.params;

    const affiliateProfileResult = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (affiliateProfileResult.length === 0) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const affiliateProfile = affiliateProfileResult[0];

    const pixelResult = await db
      .select()
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.id, pixelId),
          eq(affiliateProductPixels.affiliateId, affiliateProfile.id)
        )
      )
      .limit(1);

    if (pixelResult.length === 0) {
      return res.status(404).json({ message: "Pixel não encontrado" });
    }

    const pixel = pixelResult[0];
    const code = PixelCodeGenerator.generatePixelCode(pixel);

    res.json({ code });
  } catch (error: any) {
    console.error("Error generating pixel preview:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
