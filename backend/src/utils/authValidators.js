const { body } = require('express-validator');

const loginRules = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username wajib diisi'),
    body('password')
        .notEmpty().withMessage('Password wajib diisi')
];

module.exports = { loginRules };
