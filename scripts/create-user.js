import 'dotenv/config';
import mysql from 'mysql2/promise';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hashPassword } from '../lib/security.js';

const rl = readline.createInterface({input, output});
let db;
try {
  const name = (await rl.question('Name: ')).trim();
  const email = (await rl.question('Email: ')).trim().toLowerCase();
  const role = (await rl.question('Role (admin or technician): ')).trim().toLowerCase();
  const password = await rl.question('Password (12+ characters; input will be visible): ');
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['admin','technician'].includes(role)) {
    throw new Error('Invalid name, email, or role.');
  }
  const passwordHash = await hashPassword(password);
  db = await mysql.createConnection({host:process.env.DB_HOST || '127.0.0.1',port:Number(process.env.DB_PORT || 3306),
    user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',database:process.env.DB_NAME || 'servicepilot'});
  await db.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[name,email,passwordHash,role]);
  console.log(`User created: ${email} (${role})`);
} catch (err) { console.error('Could not create user:',err.message);process.exitCode=1; }
finally { rl.close(); await db?.end(); }
