const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const queueRoutes = require('./routes/queueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// --- Keamanan & utilitas dasar ---
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// --- Root: cuma info singkat, supaya tidak terlihat "error" kalau URL backend
//     dibuka langsung di browser tanpa path /api/... ---
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Klinik API berjalan. Endpoint publik ada di bawah /api, contoh: /api/health.'
    });
});

// --- Health check ---
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API klinik berjalan normal', time: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- 404 & error handler (harus di paling bawah) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
