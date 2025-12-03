const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'financije.db');

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const queries = [
      // Tablica za transakcije
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('prihod', 'rashod')),
        category TEXT,
        bank_reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tablica za kategorije
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('prihod', 'rashod')),
        keywords TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tablica za bankovne izvode
      `CREATE TABLE IF NOT EXISTS bank_statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT 0
      )`,
      
      // Tablica za putne naloge
      `CREATE TABLE IF NOT EXISTS travel_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_name TEXT NOT NULL,
        destination TEXT NOT NULL,
        country TEXT DEFAULT 'Hrvatska',
        departure_date TEXT NOT NULL,
        return_date TEXT NOT NULL,
        distance INTEGER DEFAULT 0,
        round_trip_distance INTEGER DEFAULT 0,
        duration_hours INTEGER DEFAULT 0,
        duration_days INTEGER DEFAULT 0,
        daily_allowance REAL DEFAULT 0,
        travel_allowance REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        accommodation BOOLEAN DEFAULT 0,
        purpose TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Indeksi za brže pretraživanje
      `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)`,
      `CREATE INDEX IF NOT EXISTS idx_travel_orders_date ON travel_orders(departure_date)`
    ];

    let completed = 0;
    queries.forEach((query) => {
      db.run(query, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
          return;
        }
        completed++;
        if (completed === queries.length) {
          // Insert default categories
          insertDefaultCategories().then(resolve).catch(reject);
        }
      });
    });
  });
};

const insertDefaultCategories = () => {
  return new Promise((resolve, reject) => {
    const defaultCategories = [
      { name: 'Plaće', type: 'prihod', keywords: 'plaća,plata,isplata plaće' },
      { name: 'Prodaja', type: 'prihod', keywords: 'prodaja,račun,faktura,prihod' },
      { name: 'Ostali prihodi', type: 'prihod', keywords: 'prihod' },
      { name: 'Računi', type: 'rashod', keywords: 'račun,struja,voda,plin,telefon,internet' },
      { name: 'Najam', type: 'rashod', keywords: 'najam,renta,stan' },
      { name: 'Materijal', type: 'rashod', keywords: 'materijal,oprema,sirovine' },
      { name: 'Usluge', type: 'rashod', keywords: 'usluga,servis,održavanje' },
      { name: 'Porezi', type: 'rashod', keywords: 'porez,PDV,prirez' },
      { name: 'Ostali rashodi', type: 'rashod', keywords: 'rashod' }
    ];

    const stmt = db.prepare(
      'INSERT OR IGNORE INTO categories (name, type, keywords) VALUES (?, ?, ?)'
    );

    let completed = 0;
    defaultCategories.forEach((cat) => {
      stmt.run([cat.name, cat.type, cat.keywords], (err) => {
        if (err) {
          console.error('Error inserting category:', err);
        }
        completed++;
        if (completed === defaultCategories.length) {
          stmt.finalize();
          resolve();
        }
      });
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const close = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  init,
  getDb,
  close
};

