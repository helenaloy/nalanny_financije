const express = require('express');
const db = require('../database');
const { categorizeTransaction } = require('../utils/parser');

const router = express.Router();

// GET /api/transactions - Dohvati sve transakcije s opcionalnim filtrima
router.get('/', (req, res) => {
  const { startDate, endDate, type, category, search } = req.query;
  const dbInstance = db.getDb();

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND description LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY date DESC, id DESC';

  dbInstance.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju transakcija' });
    }
    res.json(rows);
  });
});

// GET /api/transactions/:id - Dohvati pojedinu transakciju
router.get('/:id', (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('Error fetching transaction:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju transakcije' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Transakcija nije pronađena' });
    }
    res.json(row);
  });
});

// POST /api/transactions - Kreiraj novu transakciju
router.post('/', async (req, res) => {
  const { date, description, amount, type, category } = req.body;

  if (!date || !description || amount === undefined || !type) {
    return res.status(400).json({ error: 'Nedostaju obavezni podaci' });
  }

  // Automatska kategorizacija ako nije navedena
  const finalCategory = category || await categorizeTransaction(description, amount, type);

  const dbInstance = db.getDb();
  dbInstance.run(
    `INSERT INTO transactions (date, description, amount, type, category)
     VALUES (?, ?, ?, ?, ?)`,
    [date, description, amount, type, finalCategory],
    function(err) {
      if (err) {
        console.error('Error creating transaction:', err);
        return res.status(500).json({ error: 'Greška pri kreiranju transakcije' });
      }
      res.status(201).json({
        id: this.lastID,
        date,
        description,
        amount,
        type,
        category: finalCategory
      });
    }
  );
});

// PUT /api/transactions/:id - Ažuriraj transakciju
router.put('/:id', async (req, res) => {
  const { date, description, amount, type, category } = req.body;
  const dbInstance = db.getDb();

  // Automatska kategorizacija ako nije navedena
  const finalCategory = category || await categorizeTransaction(description, amount, type);

  dbInstance.run(
    `UPDATE transactions 
     SET date = ?, description = ?, amount = ?, type = ?, category = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [date, description, amount, type, finalCategory, req.params.id],
    function(err) {
      if (err) {
        console.error('Error updating transaction:', err);
        return res.status(500).json({ error: 'Greška pri ažuriranju transakcije' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transakcija nije pronađena' });
      }
      res.json({ message: 'Transakcija uspješno ažurirana' });
    }
  );
});

// DELETE /api/transactions/:id - Obriši transakciju
router.delete('/:id', (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('Error deleting transaction:', err);
      return res.status(500).json({ error: 'Greška pri brisanju transakcije' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transakcija nije pronađena' });
    }
    res.json({ message: 'Transakcija uspješno obrisana' });
  });
});

// GET /api/transactions/categories/list - Dohvati sve kategorije
router.get('/categories/list', (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.all('SELECT * FROM categories ORDER BY type, name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju kategorija' });
    }
    res.json(rows);
  });
});

module.exports = router;

