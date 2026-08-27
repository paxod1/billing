const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Customized Products
router.get('/customized-products', inventoryController.getCustomizedProducts);
router.post('/customized-products/query', inventoryController.getCustomizedProducts);
router.post('/customized-products', inventoryController.saveCustomizedProduct);
router.put('/customized-products/:id', inventoryController.updateCustomizedProduct);
router.delete('/customized-products/:id', inventoryController.deleteCustomizedProduct);
router.post('/customized-products/restock', inventoryController.restockCustomizedProduct);
router.put('/customized-products/restock', inventoryController.restockCustomizedProduct);

// Raw Materials
router.get('/raw-materials', inventoryController.getRawMaterials);
router.post('/raw-materials/query', inventoryController.getRawMaterials);
router.post('/raw-materials', inventoryController.saveRawMaterial);
router.put('/raw-materials/:id', inventoryController.updateRawMaterial);
router.delete('/raw-materials/:id', inventoryController.deleteRawMaterial);

module.exports = router;
