const dashboardModel = require('../models/dashboardModel');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/stats (admin)
const getStats = asyncHandler(async (req, res) => {
    const [stats, recent, activeQueue, pending] = await Promise.all([
        dashboardModel.getStatsHariIni(),
        dashboardModel.getRecentAppointments(5),
        dashboardModel.getActiveQueue(5),
        dashboardModel.getPendingConfirmation(5)
    ]);

    res.json({
        success: true,
        stats,
        appointmentTerbaru: recent,
        antreanAktif: activeQueue,
        menungguKonfirmasi: pending
    });
});

module.exports = { getStats };
