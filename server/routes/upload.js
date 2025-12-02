const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../database');
const { parseBankStatement, categorizeTransaction } = require('../utils/parser');

const router = express.Router();

// Konfiguracija za spremanje uploadanih datoteka
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bank-statement-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Samo PDF datoteke su dozvoljene'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload - Upload i obrada PDF bankovnog izvoda
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nijedna datoteka nije uploadana' });
    }

    // Čitanje PDF datoteke
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Debug: loguj detaljne informacije o PDF-u
    console.log('=== PDF TEXT ANALYSIS ===');
    console.log('Total PDF text length:', pdfData.text.length);
    console.log('First 2000 chars:', pdfData.text.substring(0, 2000));
    console.log('Last 1000 chars:', pdfData.text.substring(Math.max(0, pdfData.text.length - 1000)));
    
    // Analiziraj strukturu
    const lines = pdfData.text.split(/\r?\n/);
    console.log(`Total lines: ${lines.length}`);
    console.log('First 30 lines:');
    lines.slice(0, 30).forEach((line, idx) => {
      console.log(`${idx + 1}: ${line.substring(0, 150)}`);
    });
    console.log('=== END PDF TEXT ANALYSIS ===');

    // Spremanje informacije o uploadanom izvodu
    const dbInstance = db.getDb();
    await new Promise((resolve, reject) => {
      dbInstance.run(
        'INSERT INTO bank_statements (filename, processed) VALUES (?, 0)',
        [req.file.filename],
        function(err) {
          if (err) {
            console.error('Error saving bank statement:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Parsiranje transakcija iz PDF-a
    const transactions = parseBankStatement(pdfData.text);
    
    console.log('=== PARSING RESULTS ===');
    console.log('Found transactions:', transactions.length);
    if (transactions.length === 0) {
      console.log('WARNING: No transactions found!');
      // Loguj prvih 50 redaka PDF teksta za debug
      const lines = pdfData.text.split('\n').slice(0, 50);
      console.log('First 50 lines of PDF:');
      lines.forEach((line, idx) => {
        console.log(`${idx + 1}: ${line.substring(0, 100)}`);
      });
    }

    // Debug: loguj prve nekoliko transakcija za provjeru
    console.log('Parsirane transakcije (prvih 5):');
    transactions.slice(0, 5).forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.date} - ${t.description.substring(0, 50)}... - Original: ${t.originalAmountStr || t.originalAmount}, Parsed: ${t.amount}`);
    });

    // Kategorizacija transakcija (bez spremanja)
    const previewTransactions = [];
    for (const transaction of transactions) {
      const category = await categorizeTransaction(
        transaction.description,
        transaction.amount,
        transaction.type
      );
      previewTransactions.push({
        ...transaction,
        category,
        // Dodajemo temp ID za frontend
        tempId: `temp-${Date.now()}-${Math.random()}`
      });
    }

    // Vraćamo transakcije za pregled i potvrdu
    res.json({
      message: 'Bankovni izvod uspješno parsiran',
      transactionsCount: previewTransactions.length,
      transactions: previewTransactions,
      filename: req.file.filename,
      // Ne spremamo odmah - čekamo potvrdu korisnika
      pending: true
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Greška pri obradi PDF datoteke: ' + error.message });
  }
});

// POST /api/upload/confirm - Potvrda i spremanje transakcija
router.post('/confirm', async (req, res) => {
  try {
    const { transactions, filename } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Nema transakcija za spremanje' });
    }

    const dbInstance = db.getDb();
    const savedTransactions = [];

    // Spremi sve transakcije
    for (const transaction of transactions) {
      await new Promise((resolve, reject) => {
        dbInstance.run(
          `INSERT INTO transactions (date, description, amount, type, category, bank_reference)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.type,
            transaction.category,
            transaction.reference || null
          ],
          function(err) {
            if (err) {
              console.error('Error saving transaction:', err);
              reject(err);
            } else {
              savedTransactions.push({
                id: this.lastID,
                ...transaction
              });
              resolve();
            }
          }
        );
      });
    }

    // Označi izvod kao obrađen ako je filename naveden
    if (filename) {
      await new Promise((resolve, reject) => {
        dbInstance.run(
          'UPDATE bank_statements SET processed = 1 WHERE filename = ?',
          [filename],
          function(err) {
            if (err) {
              console.error('Error updating bank statement:', err);
              // Ne odbijamo ako ovo ne uspije
            }
            resolve();
          }
        );
      });
    }

    res.json({
      message: 'Transakcije uspješno spremljene',
      transactionsCount: savedTransactions.length,
      transactions: savedTransactions
    });

  } catch (error) {
    console.error('Error confirming transactions:', error);
    res.status(500).json({ error: 'Greška pri spremanju transakcija: ' + error.message });
  }
});

module.exports = router;

