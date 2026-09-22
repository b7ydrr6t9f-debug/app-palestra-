require('dotenv').config();

const express = require('express');
const https = require('https');
const path = require('path');
const { createClient } = require('@libsql/client');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '8mb' })); // foto dell'etichetta nutrizionale come base64
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

app.put('/api/checkin/:id', async (req, res) => {
  const { peso, vita, fianchi, petto, braccio, coscia } = req.body;
  if (!peso) return res.status(400).json({ errore: 'Il peso è obbligatorio.' });
  try {
    await db.execute({
      sql: 'UPDATE checkin SET peso=?, vita=?, fianchi=?, petto=?, braccio=?, coscia=? WHERE id=?',
      args: [
        Number(peso),
        vita ? Number(vita) : null,
        fianchi ? Number(fianchi) : null,
        petto ? Number(petto) : null,
        braccio ? Number(braccio) : null,
        coscia ? Number(coscia) : null,
        Number(req.params.id)
      ]
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[Checkin] Errore modifica:', e.message);
    res.status(500).json({ errore: 'Errore database.' });
  }
});

// Singolo tentativo di chiamata a Gemini. Logga sempre il corpo grezzo della
// risposta in caso di errore, per non dover più indovinare la causa a occhio.
function chiediAGeminiUnaVolta(promptText, immagine) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('GEMINI_API_KEY non configurata sul server.'));

    const parts = [{ text: promptText }];
    if (immagine) parts.push({ inline_data: { mime_type: immagine.mimeType, data: immagine.base64 } });

    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`[Gemini] HTTP ${res.statusCode}:`, data);
          let msg = `Gemini ha risposto con errore ${res.statusCode}.`;
          try { msg = JSON.parse(data)?.error?.message || msg; } catch (e) {}
          const err = new Error(msg);
          err.statusCode = res.statusCode;
          return reject(err);
        }
        try {
          const parsed = JSON.parse(data);
          const testo = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!testo) {
            console.error('[Gemini] Risposta senza testo:', data);
            return reject(new Error(parsed?.error?.message || parsed?.candidates?.[0]?.finishReason || 'Risposta vuota da Gemini.'));
          }
          resolve(JSON.parse(testo));
        } catch (e) {
          console.error('[Gemini] Risposta non interpretabile:', data);
          reject(new Error('Risposta di Gemini non interpretabile.'));
        }
      });
    });
    req.on('error', (e) => { console.error('[Gemini] Errore di rete:', e.message); reject(e); });
    req.write(body);
    req.end();
  });
}

const attesa = (ms) => new Promise(r => setTimeout(r, ms));

// Riprova automaticamente in caso di sovraccarico temporaneo dei server
// Gemini (503) o rate limit (429), con una breve pausa crescente tra i
// tentativi — sono errori transitori, quasi sempre risolti al secondo giro.
async function chiediAGemini(promptText, immagine, tentativi = 3) {
  for (let i = 1; i <= tentativi; i++) {
    try {
      return await chiediAGeminiUnaVolta(promptText, immagine);
    } catch (e) {
      const riprovabile = e.statusCode === 503 || e.statusCode === 429;
      if (!riprovabile || i === tentativi) throw e;
      console.log(`[Gemini] Tentativo ${i} fallito (${e.statusCode}), riprovo tra ${i * 800}ms...`);
      await attesa(i * 800);
    }
  }
}

// Stima calorie e macronutrienti a partire da alimento + peso, con foto
// opzionale dell'etichetta nutrizionale per una stima molto più precisa
// (letta direttamente dall'immagine invece che indovinata dal nome).
app.post('/api/stima-calorie', async (req, res) => {
  const alimento = String(req.body.alimento || '').trim();
  const peso = String(req.body.peso || '').trim();
  const immagineBase64 = req.body.immagine; // data URL o base64 puro, opzionale
  if (!alimento || !peso) return res.status(400).json({ errore: 'Indica alimento e peso.' });

  let immagine = null;
  if (immagineBase64) {
    const match = String(immagineBase64).match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    immagine = match ? { mimeType: match[1], base64: match[2] } : { mimeType: 'image/jpeg', base64: immagineBase64 };
  }

  const prompt = immagine
    ? `Sei un nutrizionista. Nell'immagine allegata trovi l'etichetta nutrizionale di un prodotto alimentare (valori per 100g o per porzione). Leggi i valori dall'etichetta e calcola calorie e macronutrienti per una porzione di ${peso} grammi di "${alimento}". Usa i valori reali dell'etichetta, non stimarli.
Rispondi SOLO con un oggetto JSON con questa struttura esatta, senza testo aggiuntivo:
{"nome": "${alimento}", "calorie": numero_intero, "proteine_g": numero, "carboidrati_g": numero, "grassi_g": numero}`
    : `Sei un nutrizionista. Stima calorie e macronutrienti per ${peso} grammi di "${alimento}".
Rispondi SOLO con un oggetto JSON con questa struttura esatta, senza testo aggiuntivo:
{"nome": "${alimento}", "calorie": numero_intero, "proteine_g": numero, "carboidrati_g": numero, "grassi_g": numero}`;

  try {
    const stima = await chiediAGemini(prompt, immagine);
    if (typeof stima.calorie !== 'number') throw new Error('Formato di risposta inatteso.');
    res.json(stima);
  } catch (e) {
    console.error('[Calorie] Errore stima:', e.message);
    res.status(502).json({ errore: 'Non sono riuscito a stimare le calorie. Riprova.', dettaglio: e.message });
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
