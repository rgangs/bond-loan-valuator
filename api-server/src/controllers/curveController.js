// ============================================================================
// Curve Controller
// ============================================================================

const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const {
  getCurveLibrary,
  getCurveWithPoints,
  createManualCurve,
  getCurveHistory,
  fetchExternalCurve
} = require('../services/curveService');

// GET /api/curves/library
const getCurveLibraryHandler = asyncHandler(async (req, res) => {
  const library = await getCurveLibrary();
  res.json({
    success: true,
    count: library.length,
    curves: library
  });
});

// GET /api/curves/fetch
const fetchCurve = asyncHandler(async (req, res) => {
  const { name, date, source } = req.query;

  if (!name || !date) {
    throw new ValidationError('name and date query parameters are required');
  }

  let curve = null;

  try {
    curve = await getCurveWithPoints({ curveName: name, curveDate: date, source });
  } catch (error) {
    // If not found, attempt external fetch (Bloomberg or fallback)
    curve = await fetchExternalCurve({ curveName: name, curveDate: date });
  }

  if (!curve) {
    throw new ValidationError(`Curve ${name} on ${date} could not be retrieved`);
  }

  res.json({
    success: true,
    curve
  });
});

// POST /api/curves/manual
const createManualCurveHandler = asyncHandler(async (req, res) => {
  const manualCurve = await createManualCurve(req.body);

  res.status(201).json({
    success: true,
    message: 'Manual curve stored successfully',
    curve: manualCurve
  });
});

// GET /api/curves/history
const getCurveHistoryHandler = asyncHandler(async (req, res) => {
  const { name, start, end, limit } = req.query;

  if (!name) {
    throw new ValidationError('name query parameter is required');
  }

  const history = await getCurveHistory({
    curveName: name,
    startDate: start,
    endDate: end,
    limit: limit ? parseInt(limit, 10) : 50
  });

  res.json({
    success: true,
    count: history.length,
    history
  });
});

module.exports = {
  getCurveLibrary: getCurveLibraryHandler,
  fetchCurve,
  createManualCurve: createManualCurveHandler,
  getCurveHistory: getCurveHistoryHandler
};
