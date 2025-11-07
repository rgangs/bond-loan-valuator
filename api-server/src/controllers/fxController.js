// ============================================================================
// FX Controller
// ============================================================================

const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { getFxRate, storeFxRate } = require('../services/fxService');

// GET /api/fx/rate
const getRate = asyncHandler(async (req, res) => {
  const { from, to, date } = req.query;
  const rate = await getFxRate({
    fromCurrency: from,
    toCurrency: to,
    rateDate: date
  });

  res.json({
    success: true,
    rate
  });
});

// GET /api/fx/rates
const getRates = asyncHandler(async (req, res) => {
  const { base, currencies, date } = req.query;

  if (!base || !currencies) {
    throw new ValidationError('base and currencies query parameters are required');
  }

  const targets = (currencies || '').split(',').map((code) => code.trim()).filter(Boolean);
  const results = [];

  for (const currency of targets) {
    try {
      const rate = await getFxRate({
        fromCurrency: base,
        toCurrency: currency,
        rateDate: date
      });
      results.push(rate);
    } catch (error) {
      results.push({
        from_currency: base,
        to_currency: currency,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    rates: results
  });
});

// POST /api/fx/manual
const createManualRate = asyncHandler(async (req, res) => {
  const { from_currency, to_currency, rate_date, rate } = req.body;
  const stored = await storeFxRate({
    from_currency,
    to_currency,
    rate_date,
    rate,
    source: 'manual'
  });

  res.status(201).json({
    success: true,
    message: 'FX rate saved',
    rate: stored
  });
});

module.exports = {
  getRate,
  getRates,
  createManualRate
};
