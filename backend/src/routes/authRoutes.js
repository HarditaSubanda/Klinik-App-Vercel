const express = require('express');
const router = express.Router();

const { login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');
const { loginRules } = require('../utils/authValidators');

router.post('/login', loginLimiter, loginRules, login);
router.get('/me', requireAuth, me);

module.exports = router;
