// ============================================================================
// Excel Generator
// ============================================================================
// Uses exceljs to produce a valuation audit workbook with summary tabs and the
// granular calculation steps used during the DCF run.
// ============================================================================

const ExcelJS = require('exceljs');

const formatCurrency = (sheet, columnLetter) => {
  sheet.getColumn(columnLetter).numFmt = '#,##0.00';
};

const formatPercentage = (sheet, columnLetter) => {
  sheet.getColumn(columnLetter).numFmt = '0.00%';
};

const generateAuditWorkbook = async ({
  valuation,
  audit_logs,
  calculation_steps,
  security,
  valuation_history = [],
  cash_flows = []
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bond & Loan Valuator';
  workbook.created = new Date();

  const curveSetup = valuation.curveSetup || audit_logs.find((log) => log.details?.curve_setup)?.details?.curve_setup || null;

  // ============================================================================
  // Summary Sheet with Enhanced Formatting
  // ============================================================================
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Value', key: 'value', width: 32 }
  ];

  // Style header row
  summarySheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' }
  };
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const summaryData = [
    { metric: 'Security', value: security?.security_name || security?.security_id || valuation.security_id },
    { metric: 'ISIN', value: security?.isin || 'N/A' },
    { metric: 'Instrument Type', value: security?.instrument_type || 'N/A' },
    { metric: 'Valuation Date', value: valuation.valuation_date },
    { metric: 'Currency', value: valuation.currency }
  ];

  if (curveSetup?.benchmark) {
    summaryData.push(
      {
        metric: 'Benchmark Curve',
        value: `${curveSetup.benchmark.name} (${curveSetup.benchmark.source || 'unknown'})`
      },
      {
        metric: 'Benchmark Curve Date',
        value: curveSetup.benchmark.curve_date || valuation.valuation_date || ''
      }
    );
  }

  if (curveSetup?.spread) {
    summaryData.push(
      {
        metric: 'Required Spread Curve',
        value: `${curveSetup.spread.name} (${curveSetup.spread.source || 'unknown'})`
      },
      {
        metric: 'Spread Curve Date',
        value: curveSetup.spread.curve_date || curveSetup.benchmark?.curve_date || ''
      }
    );
  }

  if (curveSetup?.manual_spreads && Object.keys(curveSetup.manual_spreads).length > 0) {
    const manualSpreadSummary = Object.entries(curveSetup.manual_spreads)
      .map(([tenor, bps]) => `${tenor}: ${bps}bps`)
      .join(', ');

    summaryData.push({ metric: 'Manual Spread Overrides', value: manualSpreadSummary });
  }

  summaryData.push(
    { metric: '', value: '' },
    { metric: 'Present Value', value: Number(valuation.present_value || 0) },
    { metric: 'Accrued Interest', value: Number(valuation.accrued_interest || 0) },
    { metric: 'Fair Value', value: Number(valuation.fair_value || 0) },
    { metric: 'Book Value', value: Number(valuation.book_value || 0) },
    { metric: '', value: '' },
    { metric: 'Unrealized Gain/Loss', value: Number(valuation.unrealized_gain_loss || 0) }
  );

  summarySheet.addRows(summaryData);

  // Apply conditional formatting to unrealized gain/loss
  const gainLossRow = summarySheet.lastRow;
  const gainLossValue = Number(valuation.unrealized_gain_loss || 0);
  if (gainLossValue > 0) {
    gainLossRow.getCell('value').font = { color: { argb: 'FF00B050' }, bold: true };
  } else if (gainLossValue < 0) {
    gainLossRow.getCell('value').font = { color: { argb: 'FFFF0000' }, bold: true };
  }

  // Highlight financial metrics
  [7, 8, 9, 10].forEach(rowNum => {
    summarySheet.getRow(rowNum).getCell('metric').font = { bold: true };
  });

  formatCurrency(summarySheet, 'B');

  // ============================================================================
  // Calculation Steps Sheet with Charts
  // ============================================================================
  const stepsSheet = workbook.addWorksheet('Calculation Steps');
  stepsSheet.columns = [
    { header: '#', key: 'step_order', width: 6 },
    { header: 'Flow Date', key: 'flow_date', width: 16 },
    { header: 'Cash Flow', key: 'cash_flow', width: 16 },
    { header: 'Tenor', key: 'tenor', width: 10 },
    { header: 'Years', key: 'years', width: 10 },
    { header: 'Benchmark Rate', key: 'benchmark_rate', width: 18 },
    { header: 'Spread Rate', key: 'spread_rate', width: 16 },
    { header: 'Discount Rate', key: 'discount_rate', width: 18 },
    { header: 'Discount Factor', key: 'discount_factor', width: 18 },
    { header: 'Present Value', key: 'present_value', width: 18 }
  ];

  // Style header row
  stepsSheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  stepsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' }
  };
  stepsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  calculation_steps.forEach((step, index) => {
    const data = step.step_data || {};
    const row = stepsSheet.addRow({
      step_order: index + 1,
      flow_date: data.flow_date || '',
      cash_flow: Number(data.cash_flow || 0),
      tenor: data.tenor || '',
      years: Number(data.years || 0),
      benchmark_rate: Number(data.benchmark_rate || 0),
      spread_rate: Number(data.spread_rate || 0),
      discount_rate: Number(data.discount_rate || 0),
      discount_factor: Number(data.discount_factor || 0),
      present_value: Number(data.present_value || 0)
    });

    // Alternate row coloring
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }
  });

  formatCurrency(stepsSheet, 'C');
  formatCurrency(stepsSheet, 'J');
  formatPercentage(stepsSheet, 'F');
  formatPercentage(stepsSheet, 'G');
  formatPercentage(stepsSheet, 'H');

  // Add totals row
  if (calculation_steps.length > 0) {
    const totalRow = stepsSheet.addRow({
      step_order: '',
      flow_date: 'TOTAL',
      cash_flow: { formula: `SUM(C2:C${stepsSheet.rowCount})` },
      tenor: '',
      years: '',
      benchmark_rate: '',
      spread_rate: '',
      discount_rate: '',
      discount_factor: '',
      present_value: { formula: `SUM(J2:J${stepsSheet.rowCount})` }
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' }
    };
  }

  // Add chart if we have calculation steps
  if (calculation_steps.length > 0) {
    const chartSheet = workbook.addWorksheet('Cash Flow Chart');

    // Create chart data
    const chart = chartSheet.addImage({
      base64: '', // ExcelJS requires base64 for images, we'll create a simple data table instead
      editAs: 'absolute'
    });

    // Add a data visualization table
    chartSheet.columns = [
      { header: 'Period', key: 'period', width: 12 },
      { header: 'Cash Flow', key: 'cash_flow', width: 18 },
      { header: 'Present Value', key: 'pv', width: 18 }
    ];

    chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    chartSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' }
    };

    calculation_steps.forEach((step, index) => {
      const data = step.step_data || {};
      chartSheet.addRow({
        period: index + 1,
        cash_flow: Number(data.cash_flow || 0),
        pv: Number(data.present_value || 0)
      });
    });

    formatCurrency(chartSheet, 'B');
    formatCurrency(chartSheet, 'C');

    // Add sparklines in summary (data bars simulation)
    for (let i = 2; i <= chartSheet.rowCount; i++) {
      const cashFlowCell = chartSheet.getCell(`B${i}`);
      const pvCell = chartSheet.getCell(`C${i}`);

      // Color-code based on value
      if (Number(cashFlowCell.value) > 0) {
        cashFlowCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' }
        };
      }

      if (Number(pvCell.value) > 0) {
        pvCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCFE2FF' }
        };
      }
    }
  }

  // ============================================================================
  // Audit Trail Sheet with Enhanced Formatting
  // ============================================================================
  const auditSheet = workbook.addWorksheet('Audit Trail');
  auditSheet.columns = [
    { header: 'Timestamp', key: 'created_at', width: 24 },
    { header: 'Action', key: 'action', width: 24 },
    { header: 'Details', key: 'details', width: 48 },
    { header: 'User', key: 'created_by', width: 16 }
  ];

  // Style header row
  auditSheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  auditSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' }
  };
  auditSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  audit_logs.forEach((log, index) => {
    const row = auditSheet.addRow({
      created_at: log.created_at,
      action: log.action,
      details: JSON.stringify(log.details || {}),
      created_by: log.created_by || ''
    });

    // Alternate row coloring
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }

    // Color code by action type
    const actionCell = row.getCell('action');
    if (log.action && log.action.toLowerCase().includes('error')) {
      actionCell.font = { color: { argb: 'FFFF0000' }, bold: true };
    } else if (log.action && log.action.toLowerCase().includes('success')) {
      actionCell.font = { color: { argb: 'FF00B050' }, bold: true };
    }
  });

  // ============================================================================
  // Security Details Sheet
  // ============================================================================
  if (security) {
    const securitySheet = workbook.addWorksheet('Security Details');
    securitySheet.columns = [
      { header: 'Field', key: 'field', width: 28 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    // Style header
    securitySheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    securitySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' }
    };

    const securityDetails = [
      { field: 'Security Name', value: security.security_name || '' },
      { field: 'ISIN', value: security.isin || 'N/A' },
      { field: 'CUSIP', value: security.cusip || 'N/A' },
      { field: 'Ticker', value: security.ticker || 'N/A' },
      { field: '', value: '' },
      { field: 'Instrument Type', value: security.instrument_type || '' },
      { field: 'Currency', value: security.currency || '' },
      { field: 'Issuer', value: security.issuer_name || '' },
      { field: 'Seniority', value: security.seniority || '' },
      { field: '', value: '' },
      { field: 'Coupon', value: security.coupon ? `${security.coupon}%` : 'N/A' },
      { field: 'Coupon Frequency', value: security.coupon_freq || 'N/A' },
      { field: 'Day Count', value: security.day_count || '' },
      { field: '', value: '' },
      { field: 'Issue Date', value: security.issue_date || '' },
      { field: 'Maturity Date', value: security.maturity_date || '' },
      { field: 'Face Value', value: security.face_value || 100 },
      { field: '', value: '' },
      { field: 'Credit Rating', value: security.credit_rating || 'N/A' },
      { field: 'Sector', value: security.sector || 'N/A' },
      { field: 'Country', value: security.country || 'N/A' }
    ];

    securityDetails.forEach((detail, index) => {
      const row = securitySheet.addRow(detail);
      if (detail.field === '') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
      } else if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
      row.getCell('field').font = { bold: true };
    });
  }

  // ============================================================================
  // Valuation History Sheet
  // ============================================================================
  if (valuation_history.length > 0) {
    const historySheet = workbook.addWorksheet('Valuation History');
    historySheet.columns = [
      { header: 'Valuation Date', key: 'valuation_date', width: 18 },
      { header: 'Fair Value', key: 'fair_value', width: 18 },
      { header: 'Present Value', key: 'present_value', width: 18 },
      { header: 'Accrued Interest', key: 'accrued_interest', width: 18 },
      { header: 'Unrealized Gain/Loss', key: 'unrealized_gain_loss', width: 20 },
      { header: 'Currency', key: 'currency', width: 12 }
    ];

    historySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    historySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' }
    };

    valuation_history.forEach((row, index) => {
      const historyRow = historySheet.addRow({
        valuation_date: row.valuation_date,
        fair_value: Number(row.fair_value || 0),
        present_value: Number(row.present_value || 0),
        accrued_interest: Number(row.accrued_interest || 0),
        unrealized_gain_loss: Number(row.unrealized_gain_loss || 0),
        currency: row.currency || ''
      });

      if (index % 2 === 0) {
        historyRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    });

    formatCurrency(historySheet, 'B');
    formatCurrency(historySheet, 'C');
    formatCurrency(historySheet, 'D');
    formatCurrency(historySheet, 'E');
  }

  // ============================================================================
  // Cash Flows Sheet
  // ============================================================================
  if (cash_flows.length > 0) {
    const cashFlowSheet = workbook.addWorksheet('Cash Flows');
    cashFlowSheet.columns = [
      { header: 'Flow Date', key: 'flow_date', width: 18 },
      { header: 'Amount', key: 'flow_amount', width: 16 },
      { header: 'Type', key: 'flow_type', width: 14 },
      { header: 'Realized', key: 'is_realized', width: 10 },
      { header: 'Defaulted', key: 'is_defaulted', width: 10 },
      { header: 'Payment Status', key: 'payment_status', width: 16 },
      { header: 'Created At', key: 'created_at', width: 22 },
      { header: 'Updated At', key: 'updated_at', width: 22 }
    ];

    cashFlowSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cashFlowSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' }
    };

    cash_flows.forEach((row, index) => {
      const cashFlowRow = cashFlowSheet.addRow({
        flow_date: row.flow_date,
        flow_amount: Number(row.flow_amount || 0),
        flow_type: row.flow_type,
        is_realized: row.is_realized ? 'Yes' : 'No',
        is_defaulted: row.is_defaulted ? 'Yes' : 'No',
        payment_status: row.payment_status || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      });

      if (index % 2 === 0) {
        cashFlowRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    });

    formatCurrency(cashFlowSheet, 'B');
  }

  return workbook;
};

module.exports = {
  generateAuditWorkbook
};
