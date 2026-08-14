/**
 * Membungkus async route handler supaya error otomatis diteruskan
 * ke middleware error handler (next(err)) tanpa perlu try/catch berulang
 * di setiap controller.
 */
module.exports = function asyncHandler(fn) {
    return function wrapped(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
