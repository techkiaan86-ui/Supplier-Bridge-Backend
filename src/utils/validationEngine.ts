import { PrismaClient, NotificationType, Severity } from '@prisma/client';
import { NotificationService } from '../services/notification.service';

/**
 * Validation Engine
 * ─────────────────
 * Runs after every product create / update.
 * Clears old open ValidationLog entries for this product,
 * then re-checks the product and inserts one row per issue found.
 *
 * Checks performed:
 *   1. missing_price      — no price row, or retail price = 0
 *   2. missing_image      — no product images linked
 *   3. missing_category   — categoryId is null
 *   4. missing_inventory  — no inventory row, or quantity = 0
 *   5. missing_description — description is null / empty
 *   6. duplicate_sku      — same SKU exists on a different product
 */
export async function runProductValidation(productId: string, prisma: PrismaClient): Promise<boolean> {
  try {
    // Load the full product from DB
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        prices: true,
        images: true,
        inventory: true,
      },
    });

    if (!product) return false;

    // ── 1. Remove all existing OPEN validation issues for this product ──
    await prisma.validationLog.deleteMany({
      where: {
        entityId: productId,
        entityType: 'Product',
        status: 'open',
      },
    });

    const issues: { issue: string; errorType: string }[] = [];

    // ── 2. Check: Missing / zero price ──────────────────────────────────
    const price = product.prices?.[0];
    if (!price || price.price === 0 || price.price === null) {
      issues.push({
        errorType: 'missing_price',
        issue: `Product "${product.title}" (SKU: ${product.sku}) has no retail price set. Add a price before publishing.`,
      });
    }

    // ── 3. Check: Missing image ─────────────────────────────────────────
    if (!product.images || product.images.length === 0) {
      issues.push({
        errorType: 'missing_image',
        issue: `Product "${product.title}" (SKU: ${product.sku}) has no product images. At least one image is required.`,
      });
    }

    // ── 4. Check: Missing category ──────────────────────────────────────
    if (!product.categoryId) {
      issues.push({
        errorType: 'missing_category',
        issue: `Product "${product.title}" (SKU: ${product.sku}) is not assigned to any category. Assign a category before publishing.`,
      });
    }

    // ── 5. Check: Missing / zero inventory ──────────────────────────────
    const inv = product.inventory?.[0];
    if (!inv || inv.quantity === 0) {
      issues.push({
        errorType: 'missing_inventory',
        issue: `Product "${product.title}" (SKU: ${product.sku}) has zero inventory. Update stock quantity.`,
      });
    }

    // ── 6. Check: Missing description ───────────────────────────────────
    if (!product.description || product.description.trim() === '') {
      issues.push({
        errorType: 'missing_description',
        issue: `Product "${product.title}" (SKU: ${product.sku}) is missing a product description. Add a description for SEO and storefront display.`,
      });
    }

    // ── 7. Check: Duplicate SKU ─────────────────────────────────────────
    const dupSku = await prisma.product.findFirst({
      where: {
        sku: product.sku,
        id: { not: productId },
      },
    });
    if (dupSku) {
      issues.push({
        errorType: 'duplicate_sku',
        issue: `Duplicate SKU detected: "${product.sku}" already exists on product "${dupSku.title}". SKUs must be unique across all products.`,
      });
    }

    // ── 8. Persist all found issues into ValidationLog ──────────────────
    if (issues.length > 0) {
      for (const { issue, errorType } of issues) {
        try {
          await prisma.validationLog.create({
            data: {
              entityId: productId,
              entityType: 'Product',
              issue: `[${errorType}] ${issue}`,
              status: 'open',
            },
          });
        } catch (e) {}
      }

      // Trigger a single notification for the product if it has issues
      NotificationService.triggerEvent(
        NotificationType.VALIDATION_REQUIRED,
        'Validation Required',
        `Product "${product.title}" (SKU: ${product.sku}) has ${issues.length} validation issue(s) that require attention.`,
        Severity.WARNING,
        { productId, issueCount: issues.length }
      ).catch(console.error);
    }
    
    return issues.length === 0;
  } catch (err) {
    // Non-fatal — validation failures should never break the main product save
    console.error(`[ValidationEngine] Error running validation for product ${productId}:`, err);
    return false;
  }
}
