// ============================================================================
// Loan Cash Flow Engine (Simplified)
// ============================================================================
// Generates amortisation style cash flows for term loans. The implementation
// uses the amort_schedule JSON when provided, otherwise it falls back to an
// even principal repayment profile across the loan term.
// ============================================================================

const { generateAmortizationDates } = require('../utils/dateUtils');

const generateLoanCashFlows = (security, valuationDate) => {
  const {
    instrument_type,
    issue_date,
    maturity_date,
    coupon_freq,
    amort_schedule,
    face_value,
    coupon
  } = security;

  const valuation = new Date(valuationDate);

  if (Array.isArray(amort_schedule) && amort_schedule.length > 0) {
    return amort_schedule.map((row) => {
      const date = new Date(row.date);
      const isRealized = date <= valuation;

      return {
        flow_date: date,
        flow_amount: Number(row.principal_payment || 0) + Number(row.interest_payment || 0),
        flow_type: row.principal_payment && Number(row.principal_payment) !== 0 ? 'principal' : 'interest',
        is_realized: isRealized,
        is_defaulted: false,
        payment_status: isRealized ? 'paid' : 'projected'
      };
    });
  }

  // Even amortisation fallback
  const dates = generateAmortizationDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq || 'QUARTERLY'
  );

  const notional = Number(face_value || 100);
  const couponRate = Number(coupon || 0) / 100;
  const principalPerPeriod = notional / dates.length;

  return dates.map((date) => {
    const interest = notional * couponRate / dates.length;
    const isRealized = date <= valuation;

    return [{
      flow_date: date,
      flow_amount: interest,
      flow_type: 'interest',
      is_realized: isRealized,
      is_defaulted: false,
      payment_status: isRealized ? 'paid' : 'projected'
    }, {
      flow_date: date,
      flow_amount: principalPerPeriod,
      flow_type: 'principal',
      is_realized: isRealized,
      is_defaulted: false,
      payment_status: isRealized ? 'paid' : 'projected'
    }];
  }).flat();
};

module.exports = {
  generateLoanCashFlows
};
