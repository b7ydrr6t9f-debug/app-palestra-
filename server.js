require('dotenv').config();

const express = require('express');
const https = require('https');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 20000;

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: 'file:tempra-locale.sqlite' }
);

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS checkin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      peso REAL NOT NULL,
      vita REAL,
      fianchi REAL,
      petto REAL,
      braccio REAL,
      coscia REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateCheckin(body) {
  const peso = toOptionalNumber(body.peso);
  if (peso === null || peso <= 0) {
    return { error: 'Il peso è obbligatorio e deve essere un numero maggiore di zero.' };
  }

  return {
    value: {
      peso,
      vita: toOptionalNumber(body.vita),
      fianchi: toOptionalNumber(body.fianchi),
      petto: toOptionalNumber(body.petto),
      braccio: toOptionalNumber(body.braccia ?? body.braccio),
      coscia: toOptionalNumber(body.coscia),
    },
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: process.env.TURSO_DATABASE_URL ? 'turso' : 'sqlite' });
});

app.get('/api/checkin', async (req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM checkin ORDER BY data ASC, id ASC');
    res.json(result.rows.map((row) => ({
      id: Number(row.id),
      data: row.data,
      peso: row.peso,
      vita: row.vita,
      fianchi: row.fianchi,
      petto: row.petto,
      braccio: row.braccio,
      coscia: row.coscia,
    })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/checkin', async (req, res, next) => {
  const validated = validateCheckin(req.body);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    const measurements = validated.value;
    await db.execute({
      sql: `INSERT INTO checkin (data, peso, vita, fianchi, petto, braccio, coscia)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        new Date().toISOString().slice(0, 10),
        measurements.peso,
        measurements.vita,
        measurements.fianchi,
        measurements.petto,
        measurements.braccio,
        measurements.coscia,
      ],
    });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.put('/api/checkin/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID non valido.' });
  }

  const validated = validateCheckin(req.body);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    const measurements = validated.value;
    const result = await db.execute({
      sql: `UPDATE checkin
            SET peso = ?, vita = ?, fianchi = ?, petto = ?, braccio = ?, coscia = ?
            WHERE id = ?`,
      args: [
        measurements.peso,
        measurements.vita,
        measurements.fianchi,
        measurements.petto,
        measurements.braccio,
        measurements.coscia,
        id,
      ],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Check-in non trovato.' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/checkin/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID non valido.' });
  }

  try {
    const result = await db.execute({
      sql: 'DELETE FROM checkin WHERE id = ?',
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Check-in non trovato.' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

function callGeminiOnce(prompt, image) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reject(Object.assign(new Error('Servizio AI non configurato.'), { statusCode: 503 }));
    }

    const parts = [{ text: prompt }];
    if (image) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    }

    const payload = JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const request = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: GEMINI_TIMEOUT_MS,
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          let message = `Gemini ha risposto con errore ${response.statusCode}.`;
          try {
            message = JSON.parse(raw)?.error?.message || message;
          } catch (_) {}
          return reject(Object.assign(new Error(message), { statusCode: response.statusCode }));
        }

        try {
          const parsed = JSON.parse(raw);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new Error('Risposta vuota da Gemini.');
          }
          resolve(JSON.parse(text));
        } catch (_) {
          reject(new Error('Risposta di Gemini non interpretabile.'));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      reject(Object.assign(new Error('La richiesta al servizio AI è scaduta.'), { statusCode: 504 }));
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt, image, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await callGeminiOnce(prompt, image);
    } catch (error) {
      lastError = error;
      const retryable = error.statusCode === 429 || error.statusCode === 503;
      if (!retryable || attempt === attempts) break;
      await wait(attempt * 800);
    }
  }
  throw lastError;
}

function parseImage(image) {
  if (!image) return null;
  const match = String(image).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  return match
    ? { mimeType: match[1], base64: match[2] }
    : { mimeType: 'image/jpeg', base64: String(image) };
}

app.post('/api/stima-calorie', async (req, res, next) => {
  const alimento = String(req.body.alimento || '').trim();
  const peso = String(req.body.peso || '').trim();

  if (!alimento || !peso) {
    return res.status(400).json({ error: 'Indica alimento e peso.' });
  }

  const image = parseImage(req.body.immagine);
  const prompt = image
    ? `Sei un nutrizionista. Leggi l'etichetta nutrizionale nell'immagine e calcola calorie e macronutrienti per ${peso} grammi di "${alimento}". Usa i valori reali dell'etichetta. Rispondi solo con JSON: {"nome":"${alimento}","calorie":numero_intero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}`
    : `Sei un nutrizionista. Stima calorie e macronutrienti per ${peso} grammi di "${alimento}". Rispondi solo con JSON: {"nome":"${alimento}","calorie":numero_intero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}`;

  try {
    const estimate = await callGemini(prompt, image);
    if (typeof estimate?.calorie !== 'number') {
      throw new Error('Formato di risposta inatteso.');
    }
    res.json(estimate);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API non trovato.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  console.error(`[${req.method} ${req.originalUrl}]`, error.message);
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Errore interno del server.' : error.message,
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server di Tempra avviato sulla porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Errore inizializzazione database:', error.message);
    process.exit(1);
  });
