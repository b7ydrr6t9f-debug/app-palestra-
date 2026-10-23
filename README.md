# Tempra

Tempra è un'applicazione web per monitorare peso e misure corporee e stimare calorie e macronutrienti degli alimenti, anche a partire dalla foto di un'etichetta nutrizionale.

## Funzionalità

- Registrazione di check-in con peso, vita, fianchi, petto, braccio e coscia
- Cronologia dei check-in
- Modifica ed eliminazione dei record
- Stima di calorie, proteine, carboidrati e grassi tramite Google Gemini
- Supporto facoltativo alle foto delle etichette nutrizionali
- Database SQLite locale oppure Turso per dati persistenti

## Requisiti

- Node.js 20 o superiore
- Un account Turso (opzionale, consigliato in produzione)
- Una API key Google Gemini

## Installazione

```bash
npm install
cp .env.example .env
npm start
```

L'applicazione sarà disponibile su `http://localhost:10000`.

## Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---:|---|
| `PORT` | No | Porta HTTP; predefinita `10000` |
| `TURSO_DATABASE_URL` | No | URL del database Turso |
| `TURSO_AUTH_TOKEN` | Solo con Turso | Token di accesso Turso |
| `GEMINI_API_KEY` | Per la stima calorie | API key Google Gemini |
| `GEMINI_MODEL` | No | Modello Gemini; predefinito `gemini-3.6-flash` |
| `GEMINI_TIMEOUT_MS` | No | Timeout richieste Gemini; predefinito `20000` |

Senza `TURSO_DATABASE_URL`, l'app usa un file SQLite locale. Su piattaforme come Render il file locale viene azzerato a ogni deploy o riavvio: usa Turso per conservare i dati.

## API

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/health` | Stato dell'applicazione e database |
| `GET` | `/api/checkin` | Elenco check-in |
| `POST` | `/api/checkin` | Crea un check-in |
| `PUT` | `/api/checkin/:id` | Aggiorna un check-in |
| `DELETE` | `/api/checkin/:id` | Elimina un check-in |
| `POST` | `/api/stima-calorie` | Stima calorie e macronutrienti |

### Esempio check-in

```bash
curl -X POST http://localhost:10000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"peso":78.4,"vita":82,"fianchi":98}'
```

### Esempio stima calorie

```bash
curl -X POST http://localhost:10000/api/stima-calorie \
  -H "Content-Type: application/json" \
  -d '{"alimento":"riso basmati","peso":"80"}'
```

## Deploy

Il progetto è pronto per piattaforme Node.js come Render. Configura le variabili d'ambiente nel pannello della piattaforma e usa:

```bash
npm start
```

Per la produzione, configura Turso per evitare la perdita dei dati tra deploy.
