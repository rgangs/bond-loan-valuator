// ============================================================================
// FRED Curve API Configuration
// ============================================================================
// Enables integration with the local Treasury & Corporate Bond Curve Builder
// located in D:\FREDAPI. The service exposes REST endpoints that surface
// bootstrapped curves built from FRED data.
// ============================================================================

const fs = require('fs');
const path = require('path');

const defaultCurveMap = {
  US_Treasury: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  Treasury: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  US_Corporate_AAA: {
    endpoint: 'corporate',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'zero'
  },
  US_Corporate_BAA: {
    endpoint: 'corporate',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'zero'
  },
  US_Corporate_HY: {
    endpoint: 'corporate',
    rating: 'HY',
    currency: 'USD',
    curveType: 'zero'
  },
  US_Corporate_Spread_AAA: {
    endpoint: 'corporate_spread',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'spread'
  },
  US_Corporate_Spread_BAA: {
    endpoint: 'corporate_spread',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'spread'
  },
  US_TREASURY: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  UST: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  TREASURY_ZERO: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  CORP_AAA: {
    endpoint: 'corporate',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'zero'
  },
  CORP_BAA: {
    endpoint: 'corporate',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'zero'
  },
  CORP_HY: {
    endpoint: 'corporate',
    rating: 'HY',
    currency: 'USD',
    curveType: 'zero'
  },
  CORP_SPREAD_AAA: {
    endpoint: 'corporate_spread',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'spread'
  },
  CORP_SPREAD_BAA: {
    endpoint: 'corporate_spread',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'spread'
  },
  Benchmark_US_Treasury: {
    endpoint: 'treasury',
    currency: 'USD',
    curveType: 'zero'
  },
  Benchmark_US_Corporate_AAA: {
    endpoint: 'corporate',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'zero'
  },
  Benchmark_US_Corporate_BAA: {
    endpoint: 'corporate',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'zero'
  },
  Required_Spread_AAA: {
    endpoint: 'corporate_spread',
    rating: 'AAA',
    currency: 'USD',
    curveType: 'spread'
  },
  Required_Spread_BAA: {
    endpoint: 'corporate_spread',
    rating: 'BAA',
    currency: 'USD',
    curveType: 'spread'
  },
  Required_Spread_HY: {
    endpoint: 'corporate_spread',
    rating: 'HY',
    currency: 'USD',
    curveType: 'spread'
  }
};

let customCurveMap = {};
let fileCurveMap = {};

const tryLoadCurveMapFile = (candidatePath) => {
  if (!candidatePath) {
    return;
  }

  const resolved = path.resolve(candidatePath);
  if (!fs.existsSync(resolved)) {
    return;
  }

  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      fileCurveMap = {
        ...fileCurveMap,
        ...parsed
      };
    } else {
      console.warn(`FRED curve map file at ${resolved} did not contain an object`);
    }
  } catch (error) {
    console.warn(`Unable to read FRED curve map file at ${resolved}:`, error.message);
  }
};

if (process.env.FRED_API_CURVE_MAP) {
  try {
    const parsed = JSON.parse(process.env.FRED_API_CURVE_MAP);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      customCurveMap = parsed;
    }
  } catch (error) {
    console.warn('FRED_API_CURVE_MAP could not be parsed as JSON:', error.message);
  }
}

const curveMapFileEnv = process.env.FRED_API_CURVE_MAP_FILE;
const defaultCurveMapFile = path.resolve(__dirname, '../../config/fred.curve-map.json');

if (curveMapFileEnv) {
  tryLoadCurveMapFile(curveMapFileEnv);
}

tryLoadCurveMapFile(defaultCurveMapFile);

const fredConfig = {
  enabled: process.env.FRED_API_ENABLED !== 'false',
  baseUrl: (process.env.FRED_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, ''),
  timeout: parseInt(process.env.FRED_API_TIMEOUT || '15000', 10),
  maxPoints: parseInt(process.env.FRED_API_MAX_POINTS || '120', 10),
  defaultCurrency: process.env.FRED_API_DEFAULT_CURRENCY || 'USD',
  syncTtlDays: parseInt(process.env.FRED_API_SYNC_TTL_DAYS || '1', 10),
  curveMap: {
    ...defaultCurveMap,
    ...fileCurveMap,
    ...customCurveMap
  }
};

const isConfigured = () => fredConfig.enabled && typeof fredConfig.baseUrl === 'string' && fredConfig.baseUrl.length > 0;

const getCurveMapping = (curveName) => {
  if (!curveName) {
    return null;
  }
  return fredConfig.curveMap[curveName] || null;
};

module.exports = {
  fredConfig,
  isConfigured,
  getCurveMapping
};
