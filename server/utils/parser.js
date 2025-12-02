const { format, parse, isValid } = require('date-fns');
const { hr } = require('date-fns/locale');
const db = require('../database');

// Parsiranje bankovnog izvoda iz PDF teksta
// Ova funkcija treba biti prilagođena specifičnom formatu bankovnog izvoda
const parseBankStatement = (pdfText) => {
  const transactions = [];
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Regex patterni za različite formate transakcija
  // Format: DD.MM.YYYY Opis transakcije +/-XXXX.XX
  const datePattern = /(\d{1,2}\.\d{1,2}\.\d{4})/;
  const amountPattern = /([+-]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/;
  
  let currentDate = null;
  let currentDescription = [];
  let currentAmount = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Provjeri je li linija datum
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      // Ako imamo prethodnu transakciju, spremi je
      if (currentDate && currentDescription.length > 0 && currentAmount !== null) {
        transactions.push({
          date: formatDate(currentDate),
          description: currentDescription.join(' '),
          amount: parseAmount(currentAmount),
          type: currentAmount >= 0 ? 'prihod' : 'rashod',
          reference: null
        });
      }
      
      currentDate = dateMatch[1];
      currentDescription = [];
      currentAmount = null;
      continue;
    }

    // Provjeri je li linija iznos
    const amountMatch = line.match(amountPattern);
    if (amountMatch && currentDate) {
      const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
      currentAmount = parseFloat(amountStr);
      continue;
    }

    // Ako imamo datum, ova linija je dio opisa
    if (currentDate && line.length > 3) {
      currentDescription.push(line);
    }
  }

  // Spremi posljednju transakciju
  if (currentDate && currentDescription.length > 0 && currentAmount !== null) {
    transactions.push({
      date: formatDate(currentDate),
      description: currentDescription.join(' '),
      amount: parseAmount(currentAmount),
      type: currentAmount >= 0 ? 'prihod' : 'rashod',
      reference: null
    });
  }

  return transactions;
};

// Formatiranje datuma u YYYY-MM-DD format
const formatDate = (dateStr) => {
  try {
    // Pretpostavljamo format DD.MM.YYYY
    const [day, month, year] = dateStr.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
};

// Parsiranje iznosa (pretvara u pozitivan broj)
const parseAmount = (amount) => {
  return Math.abs(amount);
};

// Automatska kategorizacija transakcija
const categorizeTransaction = (description, amount) => {
  return new Promise((resolve) => {
    const dbInstance = db.getDb();
    const type = amount >= 0 ? 'prihod' : 'rashod';
    const descLower = description.toLowerCase();

    // Pronađi kategoriju koja odgovara ključnim riječima
    dbInstance.all(
      'SELECT name, keywords FROM categories WHERE type = ?',
      [type],
      (err, categories) => {
        if (err) {
          console.error('Error fetching categories:', err);
          resolve(type === 'prihod' ? 'Ostali prihodi' : 'Ostali rashodi');
          return;
        }

        // Provjeri svaku kategoriju
        for (const category of categories) {
          if (category.keywords) {
            const keywords = category.keywords.split(',').map(k => k.trim().toLowerCase());
            if (keywords.some(keyword => descLower.includes(keyword))) {
              resolve(category.name);
              return;
            }
          }
        }

        // Ako nije pronađena kategorija, koristi default
        resolve(type === 'prihod' ? 'Ostali prihodi' : 'Ostali rashodi');
      }
    );
  });
};

module.exports = {
  parseBankStatement,
  categorizeTransaction,
  formatDate,
  parseAmount
};

