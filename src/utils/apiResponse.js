const sendResponse = (res, { success, data = null, message = '', status = 200 }) => {
  return res.status(status).json({
    success,
    data,
    message,
    status,
  });
};

const sendSuccess = (res, { data = null, message = '', status = 200 }) =>
  sendResponse(res, { success: true, data, message, status });

const sendError = (res, { message = 'Something went wrong', status = 500, data = null }) =>
  sendResponse(res, { success: false, data, message, status });

module.exports = { sendResponse, sendSuccess, sendError };
