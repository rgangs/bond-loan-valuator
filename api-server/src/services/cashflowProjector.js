// ============================================================================
// Cash Flow Projection Service
// ============================================================================

const db = require('../config/database');
const {
  generateFixedBondCashFlows,
  generateZeroCouponBondCashFlows
} = require('./bondEngine');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { formatDateISO, isPast } = require('../utils/dateUtils');

let floaterEngine;
let stepUpEngine;
let inflationLinkedEngine;
let loanEngine;

const ensureOptionalEnginesLoaded = () => {
  try {
    floaterEngine = floaterEngine || require('./floaterEngine');
  } catch (error) {
    floaterEngine = null;
  }

  try {
    stepUpEngine = stepUpEngine || require('./stepUpEngine');
  } catch (error) {
    stepUpEngine = null;
  }

  try {
    inflationLinkedEngine = inflationLinkedEngine || require('./inflationLinkedEngine');
  } catch (error) {
    inflationLinkedEngine = null;
  }

  try {
    loanEngine = loanEngine || require('./loanEngine');
  } catch (error) {
    loanEngine = null;
  }
};

const mapGeneratedFlow = (flow) => ({
  flow_date: formatDateISO(new Date(flow.flow_date)),
  flow_amount: Number(flow.flow_amount),
  flow_type: flow.flow_type,
  is_realized: !!flow.is_realized,
  is_defaulted: !!flow.is_defaulted,
  default_date: flow.default_date ? formatDateISO(new Date(flow.default_date)) : null,
  recovery_amount: flow.recovery_amount != null ? Number(flow.recovery_amount) : null,
  payment_status: flow.payment_status || (flow.is_realized ? 'paid' : 'projected')
});

const getSecurityWithMeta = async (securityId) => {
  const result = await db.query(
    `
      SELECT
        ic.security_id,
        ic.security_name,
        ic.isin,
        ic.cusip,
        ic.ticker,
        sm.*,
        ac.classification AS asset_class_classification
      FROM id_crosswalk ic
      JOIN security_master sm ON sm.security_id = ic.security_id
      LEFT JOIN LATERAL (
        SELECT asset_classes.classification
        FROM positions
        JOIN asset_classes ON asset_classes.asset_class_id = positions.asset_class_id
        WHERE positions.security_id = ic.security_id
        ORDER BY positions.created_at DESC
        LIMIT 1
      ) ac ON TRUE
      WHERE ic.security_id = $1
    `,
    [securityId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Security not found');
  }

  const record = result.rows[0];
  if (!record.classification && record.asset_class_classification) {
    record.classification = record.asset_class_classification;
  }

  return record;
};

const getExistingCashFlows = async (securityId) => {
  const flows = await db.query(
    `
      SELECT
        cash_flow_id,
        security_id,
        flow_date,
        flow_amount,
        flow_type,
        is_realized,
        is_defaulted,
        default_date,
        recovery_amount,
        payment_status,
        created_at,
        updated_at
      FROM cash_flows
      WHERE security_id = $1
      ORDER BY flow_date ASC
    `,
    [securityId]
  );

  return flows.rows.map((flow) => ({
    ...flow,
    flow_amount: Number(flow.flow_amount),
    recovery_amount: flow.recovery_amount != null ? Number(flow.recovery_amount) : null,
    flow_date: formatDateISO(new Date(flow.flow_date))
  }));
};

const dispatchCashflowGeneration = (security, valuationDate) => {
  ensureOptionalEnginesLoaded();

  const classification = String(security.asset_class_classification || security.classification || '').toLowerCase();

  if (classification === 'loan' && loanEngine?.generateLoanCashFlows) {
    return loanEngine.generateLoanCashFlows(security, valuationDate);
  }

  switch (security.instrument_type) {
    case 'bond_fixed':
      return generateFixedBondCashFlows(security, valuationDate);
    case 'bond_zero':
      return generateZeroCouponBondCashFlows(security, valuationDate);
    case 'bond_floating':
      if (floaterEngine?.generateFloatingBondCashFlows) {
        return floaterEngine.generateFloatingBondCashFlows(security, valuationDate);
      }
      break;
    case 'bond_step_up':
      if (stepUpEngine?.generateStepUpBondCashFlows) {
        return stepUpEngine.generateStepUpBondCashFlows(security, valuationDate);
      }
      break;
    case 'bond_inflation_linked':
      if (inflationLinkedEngine?.generateInflationLinkedCashFlows) {
        return inflationLinkedEngine.generateInflationLinkedCashFlows(security, valuationDate);
      }
      break;
    case 'loan_term':
    case 'loan_amortizing':
    case 'loan_revolving':
      if (loanEngine?.generateLoanCashFlows) {
        return loanEngine.generateLoanCashFlows(security, valuationDate);
      }
      break;
    default:
      break;
  }

  throw new ValidationError(`Cash flow projection not yet supported for instrument type ${security.instrument_type}`);
};

const classifyFlows = (flows, valuationDate) => {
  const valuation = new Date(valuationDate);
  const pastFlows = [];
  const futureFlows = [];

  flows.forEach((flow) => {
    const dated = new Date(flow.flow_date);
    if (isPast(dated, valuation)) {
      pastFlows.push(flow);
    } else {
      futureFlows.push(flow);
    }
  });

  return { pastFlows, futureFlows };
};

const projectSecurityCashFlows = async (securityId, valuationDate = new Date()) => {
  const security = await getSecurityWithMeta(securityId);
  const generated = dispatchCashflowGeneration(security, valuationDate).map(mapGeneratedFlow);
  const existing = await getExistingCashFlows(securityId);

  const existingKeys = new Set(existing.map((flow) => `${flow.flow_date}-${flow.flow_type}-${flow.flow_amount}`));
  const combined = [
    ...existing,
    ...generated.filter((flow) => !existingKeys.has(`${flow.flow_date}-${flow.flow_type}-${flow.flow_amount}`))
  ];

  const { pastFlows, futureFlows } = classifyFlows(combined, valuationDate);

  return {
    security,
    valuationDate: formatDateISO(new Date(valuationDate)),
    existingFlows: existing,
    projectedFlows: generated,
    allFlows: combined.sort((a, b) => new Date(a.flow_date) - new Date(b.flow_date)),
    summary: {
      totalFlows: combined.length,
      pastCount: pastFlows.length,
      futureCount: futureFlows.length,
      defaultedCount: combined.filter((flow) => flow.is_defaulted).length,
      realizedCount: combined.filter((flow) => flow.is_realized).length,
      nextPayment: futureFlows.length > 0 ? futureFlows[0] : null
    }
  };
};

module.exports = {
  projectSecurityCashFlows,
  getExistingCashFlows,
  getSecurityWithMeta
};
