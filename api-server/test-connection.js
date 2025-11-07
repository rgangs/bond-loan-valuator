require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing database connection...');
console.log('Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'MISSING'
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

pool.query('SELECT NOW()')
  .then((res) => {
    console.log('✅ Connection successful!');
    console.log('Server time:', res.rows[0].now);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  });
