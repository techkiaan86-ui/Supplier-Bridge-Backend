import express from 'express';
import {
  getProductMappings,
  createProductMapping,
  updateProductMapping,
  deleteProductMapping,
  getCategoryMappings,
  createCategoryMapping,
  updateCategoryMapping,
  deleteCategoryMapping,
  getBrandMappings,
  createBrandMapping,
  updateBrandMapping,
  deleteBrandMapping,
  getVariantMappings,
  createVariantMapping,
  updateVariantMapping,
  deleteVariantMapping,
  getAttributeMappings,
  createAttributeMapping,
  updateAttributeMapping,
  deleteAttributeMapping
} from '../controllers/mapping.controller';

const router = express.Router();

// Product mappings
router.get('/products', getProductMappings);
router.post('/products', createProductMapping);
router.put('/products/:id', updateProductMapping);
router.delete('/products/:id', deleteProductMapping);

// Category mappings
router.get('/categories', getCategoryMappings);
router.post('/categories', createCategoryMapping);
router.put('/categories/:id', updateCategoryMapping);
router.delete('/categories/:id', deleteCategoryMapping);

// Brand mappings
router.get('/brands', getBrandMappings);
router.post('/brands', createBrandMapping);
router.put('/brands/:id', updateBrandMapping);
router.delete('/brands/:id', deleteBrandMapping);

// Variant mappings
router.get('/variants', getVariantMappings);
router.post('/variants', createVariantMapping);
router.put('/variants/:id', updateVariantMapping);
router.delete('/variants/:id', deleteVariantMapping);

// Attribute mappings
router.get('/attributes', getAttributeMappings);
router.post('/attributes', createAttributeMapping);
router.put('/attributes/:id', updateAttributeMapping);
router.delete('/attributes/:id', deleteAttributeMapping);

export default router;
