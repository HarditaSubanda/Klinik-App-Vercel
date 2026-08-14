// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    console.error(err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? 'Terjadi kesalahan pada server. Coba lagi nanti.'
            : err.message
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
}

module.exports = { errorHandler, notFoundHandler };
