// ============================================================================
// Date Utilities
// ============================================================================

const { addMonths, addYears, addDays, format, parseISO, isAfter, isBefore, isEqual } = require('date-fns');

/**
 * Generate coupon payment dates
 * @param {Date} issueDate - Bond issue date
 * @param {Date} maturityDate - Bond maturity date
 * @param {string} frequency - Coupon frequency (ANNUAL, SEMI, QUARTERLY, MONTHLY)
 * @param {Date} firstCouponDate - Optional first coupon date (for odd first coupon)
 * @returns {Array<Date>} Array of coupon payment dates
 */
function generateCouponDates(issueDate, maturityDate, frequency, firstCouponDate = null) {
  const dates = [];
  const frequencyMap = {
    'ANNUAL': 12,
    'SEMI': 6,
    'QUARTERLY': 3,
    'MONTHLY': 1,
    'ZERO': 0
  };

  const monthsInterval = frequencyMap[frequency];

  if (!monthsInterval || monthsInterval === 0) {
    return []; // Zero coupon bond
  }

  // Start from first coupon date or calculated first date
  let currentDate = firstCouponDate
    ? new Date(firstCouponDate)
    : addMonths(new Date(issueDate), monthsInterval);

  // Generate dates until maturity
  while (isBefore(currentDate, maturityDate) || isEqual(currentDate, maturityDate)) {
    dates.push(new Date(currentDate));

    if (isEqual(currentDate, maturityDate)) {
      break;
    }

    currentDate = addMonths(currentDate, monthsInterval);

    // Ensure we don't go past maturity
    if (isAfter(currentDate, maturityDate)) {
      if (!dates.some(d => isEqual(d, maturityDate))) {
        dates.push(new Date(maturityDate));
      }
      break;
    }
  }

  return dates;
}

/**
 * Generate amortization schedule dates
 * @param {Date} startDate - Loan start date
 * @param {Date} maturityDate - Loan maturity date
 * @param {string} frequency - Payment frequency
 * @returns {Array<Date>} Array of payment dates
 */
function generateAmortizationDates(startDate, maturityDate, frequency) {
  return generateCouponDates(startDate, maturityDate, frequency);
}

/**
 * Adjust date for business days (simplified - doesn't account for holidays)
 * @param {Date} date - Input date
 * @param {number} days - Number of days to adjust
 * @returns {Date} Adjusted date
 */
function adjustForBusinessDays(date, days) {
  let adjustedDate = new Date(date);
  let daysAdded = 0;

  while (daysAdded < days) {
    adjustedDate = addDays(adjustedDate, 1);
    const dayOfWeek = adjustedDate.getDay();

    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return adjustedDate;
}

/**
 * Get settlement date based on trade date and settlement days
 * @param {Date} tradeDate - Trade date
 * @param {number} settlementDays - Number of settlement days (default: 2)
 * @returns {Date} Settlement date
 */
function getSettlementDate(tradeDate, settlementDays = 2) {
  return adjustForBusinessDays(tradeDate, settlementDays);
}

/**
 * Parse date from various formats
 * @param {string|Date} date - Date to parse
 * @returns {Date} Parsed date
 */
function parseDate(date) {
  if (date instanceof Date) {
    return date;
  }

  if (typeof date === 'string') {
    return parseISO(date);
  }

  throw new Error('Invalid date format');
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateISO(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if date is in the past
 * @param {Date} date - Date to check
 * @param {Date} referenceDate - Reference date (default: today)
 * @returns {boolean} True if date is in the past
 */
function isPast(date, referenceDate = new Date()) {
  return isBefore(date, referenceDate);
}

/**
 * Check if date is in the future
 * @param {Date} date - Date to check
 * @param {Date} referenceDate - Reference date (default: today)
 * @returns {boolean} True if date is in the future
 */
function isFuture(date, referenceDate = new Date()) {
  return isAfter(date, referenceDate);
}

/**
 * Get years between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Years between dates
 */
function yearsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}

module.exports = {
  generateCouponDates,
  generateAmortizationDates,
  adjustForBusinessDays,
  getSettlementDate,
  parseDate,
  formatDateISO,
  isPast,
  isFuture,
  yearsBetween
};
