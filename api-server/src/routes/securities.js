// ============================================================================
// Securities Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// GET /api/securities?asset_class_id=<uuid> - List securities
router.get('/', securityController.getSecurities);

// POST /api/securities - Create new security
router.post('/', securityController.createSecurity);

// POST /api/securities/upload/validate - Validate CSV/Excel upload (MUST be before /:id route)
router.post('/upload/validate', securityController.validateUpload);

// POST /api/securities/upload/import - Import securities from CSV/Excel (MUST be before /:id route)
router.post('/upload/import', securityController.importSecurities);

// GET /api/securities/:id - Get security by ID
router.get('/:id', securityController.getSecurityById);

// PUT /api/securities/:id - Update security
router.put('/:id', securityController.updateSecurity);

// DELETE /api/securities/:id - Delete security
router.delete('/:id', securityController.deleteSecurity);

module.exports = router;
