const express = require('express');
const db = require('../database');
const XLSX = require('xlsx');

const router = express.Router();

// GET /api/reports/summary - Pregled po mjesecima
router.get('/summary', (req, res) => {
  const { year } = req.query;
  const dbInstance = db.getDb();

  let query = `
    SELECT 
      strftime('%Y-%m', date) as month,
      type,
      category,
      SUM(amount) as total
    FROM transactions
    WHERE 1=1
  `;
  const params = [];

  if (year) {
    query += ' AND strftime("%Y", date) = ?';
    params.push(year);
  }

  query += ' GROUP BY month, type, category ORDER BY month DESC, type, category';

  dbInstance.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching summary:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju pregleda' });
    }

    // Grupiraj po mjesecima
    const summary = {};
    rows.forEach(row => {
      if (!summary[row.month]) {
        summary[row.month] = {
          month: row.month,
          prihodi: {},
          rashodi: {},
          totalPrihodi: 0,
          totalRashodi: 0,
          saldo: 0
        };
      }

      if (row.type === 'prihod') {
        summary[row.month].prihodi[row.category] = row.total;
        summary[row.month].totalPrihodi += row.total;
      } else {
        summary[row.month].rashodi[row.category] = row.total;
        summary[row.month].totalRashodi += row.total;
      }

      summary[row.month].saldo = summary[row.month].totalPrihodi - summary[row.month].totalRashodi;
    });

    res.json(Object.values(summary));
  });
});

// GET /api/reports/yearly - Pregled po godinama
router.get('/yearly', (req, res) => {
  const dbInstance = db.getDb();

  const query = `
    SELECT 
      strftime('%Y', date) as year,
      type,
      category,
      SUM(amount) as total
    FROM transactions
    GROUP BY year, type, category
    ORDER BY year DESC, type, category
  `;

  dbInstance.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching yearly report:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju godišnjeg pregleda' });
    }

    // Grupiraj po godinama
    const summary = {};
    rows.forEach(row => {
      if (!summary[row.year]) {
        summary[row.year] = {
          year: row.year,
          prihodi: {},
          rashodi: {},
          totalPrihodi: 0,
          totalRashodi: 0,
          saldo: 0
        };
      }

      if (row.type === 'prihod') {
        summary[row.year].prihodi[row.category] = row.total;
        summary[row.year].totalPrihodi += row.total;
      } else {
        summary[row.year].rashodi[row.category] = row.total;
        summary[row.year].totalRashodi += row.total;
      }

      summary[row.year].saldo = summary[row.year].totalPrihodi - summary[row.year].totalRashodi;
    });

    res.json(Object.values(summary));
  });
});

// GET /api/reports/export - Izvoz podataka u Excel
router.get('/export', (req, res) => {
  const { startDate, endDate, format } = req.query;
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

  query += ' ORDER BY date DESC';

  dbInstance.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching transactions for export:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju podataka za izvoz' });
    }

    if (format === 'excel' || !format) {
      // Kreiraj Excel datoteku
      const worksheet = XLSX.utils.json_to_sheet(rows.map(row => ({
        'Datum': row.date,
        'Opis': row.description,
        'Iznos': row.amount,
        'Tip': row.type === 'prihod' ? 'Prihod' : 'Rashod',
        'Kategorija': row.category,
        'Referenca': row.bank_reference || ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transakcije');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=transakcije-${Date.now()}.xlsx`);
      res.send(excelBuffer);
    } else if (format === 'csv') {
      // CSV format
      const csvRows = rows.map(row => 
        `${row.date},"${row.description}",${row.amount},${row.type},"${row.category || ''}","${row.bank_reference || ''}"`
      );
      const csv = 'Datum,Opis,Iznos,Tip,Kategorija,Referenca\n' + csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=transakcije-${Date.now()}.csv`);
      res.send('\ufeff' + csv); // BOM za UTF-8
    } else {
      res.json(rows);
    }
  });
});

module.exports = router;

