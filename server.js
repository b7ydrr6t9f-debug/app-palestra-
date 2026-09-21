require('dotenv').config();

const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistenza su file JSON: funziona, ma su Render (senza Persistent Disk a
// pagamento) il file viene azzerato a ogni riavvio/deploy del servizio.
// Per dati che non si possono permettere di sparire, il passo successivo è
// un database vero (es. Turso, già usato nell'altro progetto).
const FILE_CHECKIN = path.join(__dirname, 'data-checkin.json');

function leggiCheckin() {
  try {
    return JSON.parse(fs.readFileSync(FILE_CHECKIN, 'utf8'));
  } catch (e) {
    return [];
  }
}

function salvaCheckin(lista) {
  fs.writeFileSync(FILE_CHECKIN, JSON.stringify(lista, null, 2));
}

app.get('/api/checkin', (req, res) => {
  res.json(leggiCheckin());
});

app.post('/api/checkin', (req, res) => {
  const { peso, vita, fianchi, petto, braccio, coscia } = req.body;
  if (!peso) return res.status(400).json({ errore: 'Il peso è obbligatorio.' });

  const lista = leggiCheckin();
  lista.push({
    id: Date.now(),
    data: new Date().toISOString().slice(0, 10),
    peso: Number(peso),
    vita: vita ? Number(vita) : null,
    fianchi: fianchi ? Number(fianchi) : null,
    petto: petto ? Number(petto) : null,
    braccio: braccio ? Number(braccio) : null,
    coscia: coscia ? Number(coscia) : null,
  });
  salvaCheckin(lista);
  res.json({ success: true });
});

app.delete('/api/checkin/:id', (req, res) => {
  const id = Number(req.params.id);
  const lista = leggiCheckin().filter(c => c.id !== id);
  salvaCheckin(lista);
  res.json({ success: true });
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
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

app.listen(PORT, () => {
  console.log(`Server web di LiberoFlow avviato sulla porta ${PORT}`);
});
