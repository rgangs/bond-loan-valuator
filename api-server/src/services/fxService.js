// ============================================================================
// FX Rate Service
// ============================================================================
// Provides access to stored FX rates with optional fallback to an external API.
// The external call is intentionally resilient: network failures will result in
// a null response rather than throwing, allowing the caller to decide next
// steps (e.g. prompt for manual input).
// ============================================================================

const axios = require('axios');
const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const sameCurrencyRate = (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate_date: new Date().toISOString().slice(0, 10),
      rate: 1,
      source: 'identity'
    };
  }
  return null;
};

const getRateFromDb = async ({ fromCurrency, toCurrency, rateDate }) => {
  const result = await db.query(
    `
      SELECT *
      FROM fx_rates
      WHERE from_currency = $1
        AND to_currency = $2
        AND ($3::date IS NULL OR rate_date = $3::date)
      ORDER BY rate_date DESC
      LIMIT 1
    `,
    [fromCurrency, toCurrency, rateDate || null]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    fx_rate_id: row.fx_rate_id,
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    rate_date: row.rate_date,
    rate: Number(row.rate),
    source: row.source
  };
};

const getRateFromExternal = async ({ fromCurrency, toCurrency, rateDate }) => {
  const apiUrl = process.env.FX_API_URL;
  const apiKey = process.env.FX_API_KEY;

  if (!apiUrl) {
    return null;
  }

  const isExchangeRateHost = apiUrl.includes('exchangerate.host');

  const params = isExchangeRateHost
    ? {
        from: fromCurrency,
        to: toCurrency,
        amount: 1,
        date: rateDate || undefined
      }
    : {
        base: fromCurrency,
        symbols: toCurrency,
        date: rateDate || undefined
      };

  try {
    const response = await axios.get(apiUrl, {
      params,
      headers: apiKey ? { 'X-API-KEY': apiKey } : undefined,
      timeout: 10000
    });

    let rate = null;
    let effectiveDate = rateDate || new Date().toISOString().slice(0, 10);

    if (isExchangeRateHost) {
      rate = response.data?.info?.rate ?? response.data?.result ?? null;
      effectiveDate = response.data?.date || effectiveDate;
    } else {
      rate = response.data?.rates?.[toCurrency] || response.data?.result?.[toCurrency] || null;
      effectiveDate = response.data?.date || effectiveDate;
    }

    if (!rate) {
      return null;
    }

    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate_date: effectiveDate,
      rate: Number(rate),
      source: process.env.FX_API_PROVIDER || 'external'
    };
  } catch (error) {
    console.warn('FX external fetch failed:', error.message);
    return null;
  }
};

const storeFxRate = async ({ from_currency, to_currency, rate_date, rate, source }) => {
  const result = await db.query(
    `
      INSERT INTO fx_rates (from_currency, to_currency, rate_date, rate, source)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_currency, to_currency, rate_date)
      DO UPDATE SET rate = EXCLUDED.rate,
                    source = EXCLUDED.source,
                    updated_at = NOW()
      RETURNING *
    `,
    [from_currency, to_currency, rate_date, rate, source || 'manual']
  );

  const row = result.rows[0];
  return {
    fx_rate_id: row.fx_rate_id,
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    rate_date: row.rate_date,
    rate: Number(row.rate),
    source: row.source
  };
};

const getFxRate = async ({ fromCurrency, toCurrency, rateDate }) => {
  if (!fromCurrency || !toCurrency) {
    throw new ValidationError('from and to currencies are required');
  }

  const identity = sameCurrencyRate(fromCurrency, toCurrency);
  if (identity) {
    return identity;
  }

  const stored = await getRateFromDb({ fromCurrency, toCurrency, rateDate });
  if (stored) {
    return stored;
  }

  // Try inverse relationship if direct rate missing
  const inverse = await getRateFromDb({
    fromCurrency: toCurrency,
    toCurrency: fromCurrency,
    rateDate
  });

  if (inverse) {
    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate_date: inverse.rate_date,
      rate: 1 / Number(inverse.rate),
      source: inverse.source
    };
  }

  const external = await getRateFromExternal({ fromCurrency, toCurrency, rateDate });
  if (external) {
    // Persist the fetched rate for future use
    await storeFxRate(external);
    return external;
  }

  throw new NotFoundError(`FX rate ${fromCurrency}/${toCurrency} not available`);
};

module.exports = {
  getFxRate,
  storeFxRate
};
