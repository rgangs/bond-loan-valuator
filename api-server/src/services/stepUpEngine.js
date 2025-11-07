// ============================================================================
// Step-Up Bond Engine (Simplified)
// ============================================================================
// Generates projected cash flows for step-up bonds by applying the step
// schedule when present. The implementation borrows heavily from the fixed
// bond engine but varies the coupon amount whenever a step takes effect.
// ============================================================================

const { generateCouponDates } = require('../utils/dateUtils');

const frequencyMap = {
  ANNUAL: 1,
  SEMI: 2,
  QUARTERLY: 4,
  MONTHLY: 12
};

const resolveCouponForDate = (security, date) => {
  let coupon = Number(security.coupon || 0);

  if (security.step_schedule && Array.isArray(security.step_schedule)) {
    security.step_schedule.forEach((step) => {
      if (new Date(step.effective_date) <= date) {
        coupon = Number(step.new_coupon);
      }
    });
  }

  return coupon;
};

const generateStepUpBondCashFlows = (security, valuationDate) => {
  const {
    issue_date,
    maturity_date,
    coupon_freq,
    face_value
  } = security;

  const couponDates = generateCouponDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq
  );

  const notional = face_value || 100;
  const frequency = frequencyMap[coupon_freq] || 2;

  return couponDates.map((date, index) => {
    const couponRate = resolveCouponForDate(security, date) / 100;
    const couponAmount = notional * couponRate / frequency;
    const isFinal = index === couponDates.length - 1;
    const isRealized = date <= new Date(valuationDate);

    const flows = [{
      flow_date: date,
      flow_amount: couponAmount,
      flow_type: 'coupon',
      is_realized: isRealized,
      is_defaulted: false,
      payment_status: isRealized ? 'paid' : 'projected'
    }];

    if (isFinal) {
      flows.push({
        flow_date: date,
        flow_amount: notional,
        flow_type: 'redemption',
        is_realized: isRealized,
        is_defaulted: false,
        payment_status: isRealized ? 'paid' : 'projected'
      });
    }

    return flows;
  }).flat();
};

module.exports = {
  generateStepUpBondCashFlows
};
