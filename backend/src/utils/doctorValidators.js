const { body, query } = require('express-validator');
const { POLI_LIST, DOCTOR_STATUS_LIST, HARI_LIST, JAM_SLOTS } = require('./constants');

const createDoctorRules = [
    body('nama')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Nama dokter harus 3-100 karakter'),
    body('poli')
        .isIn(POLI_LIST).withMessage('Poli tidak valid')
];

const updateDoctorRules = [
    body('nama')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Nama dokter harus 3-100 karakter'),
    body('poli')
        .isIn(POLI_LIST).withMessage('Poli tidak valid'),
    body('status')
        .isIn(DOCTOR_STATUS_LIST).withMessage('Status tidak valid')
];

const createScheduleRules = [
    body('hari').isIn(HARI_LIST).withMessage('Hari tidak valid'),
    body('jam').isIn(JAM_SLOTS).withMessage('Jam tidak valid')
];

const updateScheduleRules = [
    body('hari').isIn(HARI_LIST).withMessage('Hari tidak valid'),
    body('jam').isIn(JAM_SLOTS).withMessage('Jam tidak valid'),
    body('status').isIn(DOCTOR_STATUS_LIST).withMessage('Status tidak valid')
];

const availableSlotsRules = [
    query('tanggal').isISO8601().withMessage('Tanggal tidak valid')
];

module.exports = {
    createDoctorRules,
    updateDoctorRules,
    createScheduleRules,
    updateScheduleRules,
    availableSlotsRules
};
