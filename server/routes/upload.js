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

    // Kategorizacija i spremanje transakcija
    const savedTransactions = [];
    for (const transaction of transactions) {
      const category = await categorizeTransaction(transaction.description, transaction.amount);
      
      await new Promise((resolve, reject) => {
        dbInstance.run(
          `INSERT INTO transactions (date, description, amount, type, category, bank_reference)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.type,
            category,
            transaction.reference || null
          ],
          function(err) {
            if (err) {
              console.error('Error saving transaction:', err);
              reject(err);
            } else {
              savedTransactions.push({
                id: this.lastID,
                ...transaction,
                category
              });
              resolve();
            }
          }
        );
      });
    }

    // Označi izvod kao obrađen
    await new Promise((resolve, reject) => {
      dbInstance.run(
        'UPDATE bank_statements SET processed = 1 WHERE filename = ?',
        [req.file.filename],
        function(err) {
          if (err) {
            console.error('Error updating bank statement:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Bankovni izvod uspješno obrađen',
      transactionsCount: savedTransactions.length,
      transactions: savedTransactions
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Greška pri obradi PDF datoteke: ' + error.message });
  }
});

module.exports = router;

