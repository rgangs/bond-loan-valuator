const XLSX = require('../api-server/node_modules/xlsx');
const path = require('path');

// Sample data: 2 funds, 5 portfolios, 5 bonds with different compositions
const bonds = [
  // Fixed Rate Corporate Bond
  {
    security_name: 'Apple Inc. 3.25% 2029',
    issuer_name: 'Apple Inc.',
    isin: 'US037833100',
    cusip: '037833AJ4',
    ticker: 'AAPL',
    instrument_type: 'bond_fixed',
    currency: 'USD',
    coupon: 3.25,
    coupon_freq: 2,
    day_count: 'ACT/ACT',
    maturity_date: '2029-02-23',
    face_value: 1000,
    credit_rating: 'AA+',
    sector: 'Technology',
    quantity: 1000,
    book_value: 1000000
  },
  // Zero Coupon Government Bond
  {
    security_name: 'US Treasury Zero Coupon 2030',
    issuer_name: 'US Treasury',
    isin: 'US9128284S31',
    cusip: '9128284S3',
    ticker: 'T 0% 2030',
    instrument_type: 'bond_zero',
    currency: 'USD',
    coupon: 0,
    coupon_freq: 0,
    day_count: 'ACT/ACT',
    maturity_date: '2030-05-15',
    face_value: 1000,
    credit_rating: 'AAA',
    sector: 'Government',
    quantity: 500,
    book_value: 450000
  },
  // Floating Rate Note
  {
    security_name: 'Morgan Stanley Float 2027',
    issuer_name: 'Morgan Stanley',
    isin: 'US6174468670',
    cusip: '617446867',
    ticker: 'MS FRN',
    instrument_type: 'bond_floating',
    currency: 'USD',
    coupon: 1.50,
    coupon_freq: 4,
    day_count: 'ACT/360',
    maturity_date: '2027-10-20',
    face_value: 1000,
    credit_rating: 'A',
    sector: 'Financial Services',
    quantity: 750,
    book_value: 750000
  },
  // Corporate Bond - Energy
  {
    security_name: 'Shell International 4.125% 2028',
    issuer_name: 'Shell International Finance B.V.',
    isin: 'US822582AC86',
    cusip: '822582AC8',
    ticker: 'SHEL',
    instrument_type: 'bond_fixed',
    currency: 'USD',
    coupon: 4.125,
    coupon_freq: 2,
    day_count: '30/360',
    maturity_date: '2028-05-11',
    face_value: 1000,
    credit_rating: 'AA-',
    sector: 'Energy',
    quantity: 850,
    book_value: 850000
  },
  // High-Yield Corporate Bond
  {
    security_name: 'Ford Motor Credit 5.875% 2026',
    issuer_name: 'Ford Motor Credit Company',
    isin: 'US345397YU33',
    cusip: '345397YU3',
    ticker: 'F',
    instrument_type: 'bond_fixed',
    currency: 'USD',
    coupon: 5.875,
    coupon_freq: 2,
    day_count: '30/360',
    maturity_date: '2026-08-02',
    face_value: 1000,
    credit_rating: 'BB+',
    sector: 'Automotive',
    quantity: 600,
    book_value: 600000
  }
];

// Create worksheet
const ws = XLSX.utils.json_to_sheet(bonds);

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Securities');

// Define output path
const outputPath = path.join(__dirname, '..', 'sample-bonds-upload.xlsx');

// Write file
XLSX.writeFile(wb, outputPath);

console.log(`✅ Sample data file created: ${outputPath}`);
console.log(`\n📊 Data Summary:`);
console.log(`   - 5 bonds with different types and compositions`);
console.log(`   - Mix of fixed rate, zero coupon, and floating rate bonds`);
console.log(`   - Various sectors: Technology, Government, Financial, Energy, Automotive`);
console.log(`   - Different credit ratings: AAA to BB+`);
console.log(`\n📝 To use this file:`);
console.log(`   1. First, create 2 funds in the app`);
console.log(`   2. Create 5 portfolios (distribute across the funds)`);
console.log(`   3. Create asset classes for each portfolio`);
console.log(`   4. Upload this file and specify the asset_class_id`);
console.log(`   5. The securities will be imported with positions automatically`);
