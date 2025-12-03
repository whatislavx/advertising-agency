import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'advertising_agency',
  password: process.env.PGPASSWORD || 'password',
  port: Number(process.env.PGPORT) || 5432,
});

export default pool;
