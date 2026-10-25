require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: 'file:tempra-gym.sqlite' }
);

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    obiettivo TEXT DEFAULT 'Ipertrofia',
    dispendio INTEGER DEFAULT 2200,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    esercizio TEXT NOT NULL,
    serie INTEGER NOT NULL,
    ripetizioni INTEGER NOT NULL,
    peso REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS checkin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    peso REAL NOT NULL,
    vita REAL, fianchi REAL, petto REAL, braccio REAL, coscia REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function createSession(res, userId) {
  const value = String(userId);
  res.setHeader('Set-Cookie', `tempra_session=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', 'tempra_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function readSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)tempra_session=([^;]+)/);
  if (!match) return null;
  const [userId, signature] = match[1].split('.');
  if (!userId || !signature || sign(userId) !== signature) return null;
  return Number(userId);
}

async function requireAuth(req, res, next) {
  const userId = readSession(req);
  if (!userId) return res.status(401).json({ error: 'Accesso richiesto.' });
  const result = await db.execute({ sql: 'SELECT id, nome, email, obiettivo, dispendio, created_at FROM users WHERE id = ?', args: [userId] });
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Sessione non valida.' });
  req.user = user;
  next();
}

function publicUser(user) {
  return { id: user.id, nome: user.nome, email: user.email, obiettivo: user.obiettivo, dispendio: user.dispendio, created_at: user.created_at };
}

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!nome || !email || password.length < 8) {
      return res.status(400).json({ error: 'Inserisci nome, email valida e una password di almeno 8 caratteri.' });
    }
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (existing.rows.length) return res.status(409).json({ error: 'Email già registrata.' });
    const result = await db.execute({
      sql: 'INSERT INTO users (nome, email, password_hash) VALUES (?, ?, ?)',
      args: [nome, email, hashPassword(password)],
    });
    const userId = Number(result.lastInsertRowid);
    createSession(res, userId);
    const user = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] })).rows[0];
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email o password non corretti.' });
    }
    createSession(res, Number(user.id));
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch('/api/profile', requireAuth, async (req, res, next) => {
  try {
    const nome = String(req.body.nome || req.user.nome).trim();
    const obiettivo = String(req.body.obiettivo || req.user.obiettivo);
    const dispendio = Number(req.body.dispendio || req.user.dispendio);
    if (!nome || !Number.isFinite(dispendio) || dispendio <= 0) {
      return res.status(400).json({ error: 'Dati del profilo non validi.' });
    }
    await db.execute({ sql: 'UPDATE users SET nome = ?, obiettivo = ?, dispendio = ? WHERE id = ?', args: [nome, obiettivo, Math.round(dispendio), req.user.id] });
    const user = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] })).rows[0];
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get('/api/workouts', requireAuth, async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM workouts WHERE user_id = ? ORDER BY data DESC, id DESC', args: [req.user.id] });
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post('/api/workouts', requireAuth, async (req, res, next) => {
  try {
    const esercizio = String(req.body.esercizio || '').trim();
    const serie = Number(req.body.serie);
    const ripetizioni = Number(req.body.ripetizioni);
    const peso = req.body.peso === '' || req.body.peso == null ? null : Number(req.body.peso);
    const data = String(req.body.data || new Date().toISOString().slice(0, 10));
    if (!esercizio || !Number.isInteger(serie) || serie <= 0 || !Number.isInteger(ripetizioni) || ripetizioni <= 0 || (peso !== null && (!Number.isFinite(peso) || peso < 0))) {
      return res.status(400).json({ error: 'Dati dell’esercizio non validi.' });
    }
    await db.execute({ sql: 'INSERT INTO workouts (user_id, data, esercizio, serie, ripetizioni, peso) VALUES (?, ?, ?, ?, ?, ?)', args: [req.user.id, data, esercizio, serie, ripetizioni, peso] });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

app.delete('/api/workouts/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM workouts WHERE id = ? AND user_id = ?', args: [Number(req.params.id), req.user.id] });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Esercizio non trovato.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/checkin', requireAuth, async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM checkin WHERE user_id = ? ORDER BY data DESC, id DESC', args: [req.user.id] });
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post('/api/checkin', requireAuth, async (req, res, next) => {
  try {
    const peso = Number(req.body.peso);
    if (!Number.isFinite(peso) || peso <= 0) return res.status(400).json({ error: 'Peso non valido.' });
    const values = ['vita', 'fianchi', 'petto', 'braccio', 'coscia'].map((key) => {
      const value = req.body[key];
      return value === '' || value == null ? null : Number(value);
    });
    await db.execute({ sql: 'INSERT INTO checkin (user_id, data, peso, vita, fianchi, petto, braccio, coscia) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [req.user.id, new Date().toISOString().slice(0, 10), peso, ...values] });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

app.delete('/api/checkin/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM checkin WHERE id = ? AND user_id = ?', args: [Number(req.params.id), req.user.id] });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Check-in non trovato.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint non trovato.' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((error, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, error.message);
  res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Errore interno del server.' });
});

initDb().then(() => app.listen(PORT, () => console.log(`Tempra Gym avviata sulla porta ${PORT}`))).catch((error) => {
  console.error('Errore database:', error.message);
  process.exit(1);
});
