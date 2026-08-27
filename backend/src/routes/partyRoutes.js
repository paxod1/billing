const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');

router.get('/', partyController.getParties);
router.post('/query', partyController.getParties);
router.post('/', partyController.createParty);
router.post('/save-single-or-multiple', partyController.createParty);
router.get('/statement', partyController.getPartyStatement);
router.post('/export', partyController.exportParties);
router.get('/:id', partyController.getPartyById);
router.put('/:id', partyController.updateParty);
router.put('/update-by-id/:id', partyController.updateParty);
router.delete('/:id', partyController.deleteParty);

module.exports = router;
