// ============================================================================
// Bloomberg PORT Configuration
// ============================================================================
// This file configures Bloomberg PORT API integration for market curve data
// When Bloomberg credentials are available, update environment variables
// ============================================================================

const bloombergConfig = {
  enabled: process.env.BLOOMBERG_ENABLED === 'true',
  apiKey: process.env.BLOOMBERG_API_KEY || '',
  apiSecret: process.env.BLOOMBERG_API_SECRET || '',
  serverUrl: process.env.BLOOMBERG_SERVER_URL || '',
  timeout: parseInt(process.env.BLOOMBERG_TIMEOUT || '30000'),

  // Available curves (examples - will be fetched dynamically from Bloomberg)
  availableCurves: [
    'SOFR',
    'US_TREASURY_1Y',
    'US_TREASURY_2Y',
    'US_TREASURY_5Y',
    'US_TREASURY_10Y',
    'US_TREASURY_30Y',
    'EUR_SWAP',
    'EUR_EURIBOR',
    'GBP_SONIA',
    'JPY_TIBOR'
  ],

  // Fallback sources when Bloomberg is unavailable
  fallbackSources: ['github', 'manual'],

  // Cache settings
  cache: {
    enabled: true,
    ttl: parseInt(process.env.CURVE_CACHE_TTL || '3600') // 1 hour in seconds
  }
};

// Validation
const isConfigured = () => {
  return bloombergConfig.enabled &&
         bloombergConfig.apiKey &&
         bloombergConfig.apiSecret &&
         bloombergConfig.serverUrl;
};

const getStatus = () => {
  return {
    configured: isConfigured(),
    enabled: bloombergConfig.enabled,
    hasCredentials: !!(bloombergConfig.apiKey && bloombergConfig.apiSecret),
    serverUrl: bloombergConfig.serverUrl ? 'configured' : 'not configured',
    fallbackSources: bloombergConfig.fallbackSources
  };
};

module.exports = {
  bloombergConfig,
  isConfigured,
  getStatus
};
