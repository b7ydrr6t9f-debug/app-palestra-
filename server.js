const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// Serve i file statici dalla cartella corrente (dove c'è index.html)
app.use(express.static(path.join(__dirname)));

// Rotta principale che restituisce il tuo sito web LiberoFlow
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server web avviato sulla porta ${PORT}`);
});
