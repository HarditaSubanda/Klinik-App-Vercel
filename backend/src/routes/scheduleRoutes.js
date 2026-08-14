const express = require('express');
const router = express.Router();

const { updateSchedule, deleteSchedule } = require('../controllers/scheduleController');
const { requireAuth } = require('../middleware/authMiddleware');
const { updateScheduleRules } = require('../utils/doctorValidators');

// --- Khusus admin ---
router.put('/:id', requireAuth, updateScheduleRules, updateSchedule);
router.delete('/:id', requireAuth, deleteSchedule);

module.exports = router;
