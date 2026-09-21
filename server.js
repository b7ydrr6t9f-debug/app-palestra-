require('dotenv').config();

const express = require('express');
const https = require('https');
const path = require('path');
const { createClient } = require('@libsql/client');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database: usa Turso se TURSO_DATABASE_URL è configurata, altrimenti un
// file SQLite locale (comodo per sviluppare, ma su Render viene azzerato a
// ogni riavvio/deploy senza un Persistent Disk a pagamento — Turso è la
// soluzione per dati che non si possono permettere di sparire).
const usaTurso = !!process.env.TURSO_DATABASE_URL;
const db = createClient(
  usaTurso
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: 'file:tempra-locale.sqlite' }
);
console.log(`[Database] Modalità: ${usaTurso ? 'Turso (persistente)' : 'file locale (non persistente su Render senza Persistent Disk)'}`);

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS checkin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    peso REAL NOT NULL,
    vita REAL, fianchi REAL, petto REAL, braccio REAL, coscia REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

app.get('/api/checkin', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM checkin ORDER BY id ASC');
    res.json(result.rows.map(r => ({
      id: Number(r.id), data: r.data, peso: r.peso,
      vita: r.vita, fianchi: r.fianchi, petto: r.petto, braccio: r.braccio, coscia: r.coscia
    })));
  } catch (e) {
    console.error('[Checkin] Errore lettura:', e.message);
    res.status(500).json({ errore: 'Errore database.' });
  }
});

app.post('/api/checkin', async (req, res) => {
  const { peso, vita, fianchi, petto, braccio, coscia } = req.body;
  if (!peso) return res.status(400).json({ errore: 'Il peso è obbligatorio.' });

  try {
    await db.execute({
      sql: 'INSERT INTO checkin (data, peso, vita, fianchi, petto, braccio, coscia) VALUES (?,?,?,?,?,?,?)',
      args: [
        new Date().toISOString().slice(0, 10),
        Number(peso),
        vita ? Number(vita) : null,
        fianchi ? Number(fianchi) : null,
        petto ? Number(petto) : null,
        braccio ? Number(braccio) : null,
        coscia ? Number(coscia) : null,
      ]
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[Checkin] Errore salvataggio:', e.message);
    res.status(500).json({ errore: 'Errore database.' });
  }
});

app.delete('/api/checkin/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM checkin WHERE id = ?', args: [Number(req.params.id)] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ errore: 'Errore database.' });
  }
});

// Chiama l'API Gemini con un prompt che deve rispondere in JSON puro.
function chiediAGemini(promptText) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('GEMINI_API_KEY non configurata sul server.'));

    const body = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const testo = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!testo) return reject(new Error(parsed?.error?.message || 'Risposta vuota da Gemini.'));
          resolve(JSON.parse(testo));
        } catch (e) {
          reject(new Error('Risposta di Gemini non interpretabile.'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Stima calorie e macronutrienti a partire da una descrizione libera di un pasto.
app.post('/api/stima-calorie', async (req, res) => {
  const descrizione = String(req.body.descrizione || '').trim();
  if (!descrizione) return res.status(400).json({ errore: 'Descrivi cosa hai mangiato.' });

  const prompt = `Sei un nutrizionista. Analizza questa descrizione di un pasto o alimento e stima calorie e macronutrienti, basandoti sulle quantità indicate (se non indicate, assumi una porzione standard).
Descrizione: "${descrizione}"

Rispondi SOLO con un oggetto JSON con questa struttura esatta, senza testo aggiuntivo:
{"nome": "nome sintetico dell'alimento/pasto", "calorie": numero_intero, "proteine_g": numero, "carboidrati_g": numero, "grassi_g": numero}`;

  try {
    const stima = await chiediAGemini(prompt);
    if (typeof stima.calorie !== 'number') throw new Error('Formato di risposta inatteso.');
    res.json(stima);
  } catch (e) {
    console.error('[Calorie] Errore stima:', e.message);
    res.status(502).json({ errore: 'Non sono riuscito a stimare le calorie. Riprova con una descrizione più chiara.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server web di Tempra avviato sulla porta ${PORT}`);
  });
}).catch(e => {
  console.error('[Database] Errore inizializzazione:', e.message);
  process.exit(1);
});
