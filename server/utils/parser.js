const { format, parse, isValid } = require('date-fns');
const { hr } = require('date-fns/locale');
const db = require('../database');

// Parsiranje bankovnog izvoda iz PDF teksta
// Pojednostavljena i robustnija verzija
const parseBankStatement = (pdfText) => {
  const transactions = [];
  
  if (!pdfText || pdfText.length < 100) {
    console.log('❌ PDF tekst je prekratak ili prazan');
    return transactions;
  }

  console.log('=== PARSING PDF ===');
  console.log('PDF text length:', pdfText.length);
  console.log('First 2000 chars:', pdfText.substring(0, 2000));
  console.log('Last 500 chars:', pdfText.substring(Math.max(0, pdfText.length - 500)));

  // Zadržaj originalni format
  const lines = pdfText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  console.log(`Total lines in PDF: ${lines.length}`);

  // Pattern za datum u formatu DD.MM.YYYY
  const datePattern = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
  
  // Pattern za iznose u hrvatskom formatu (npr. 2.500,00 ili 16,85)
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

  // Pronađi sve retke koji sadrže i datum i iznos
  const candidateLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;

    // Preskoči očito ne-transakcije
    const lineLower = line.toLowerCase();
    if (lineLower.includes('izvadak') || 
        lineLower.includes('stanje prethodnog') ||
        lineLower.includes('ukupni') ||
        lineLower.includes('novo stanje') ||
        lineLower.includes('kraj') && lineLower.includes('izvatka')) {
      continue;
    }

    const dates = [...line.matchAll(datePattern)].map(m => m[1]);
    const amounts = [...line.matchAll(amountPattern)].map(m => m[1]);

    if (dates.length > 0 && amounts.length > 0) {
      candidateLines.push({
        lineIndex: i,
        line: line,
        dates: dates,
        amounts: amounts
      });
      console.log(`Candidate line ${i + 1}: ${line.substring(0, 150)}`);
    }
  }

  console.log(`Found ${candidateLines.length} candidate lines with dates and amounts`);

  if (candidateLines.length === 0) {
    console.log('❌ No candidate lines found - trying alternative parsing');
    return parseAlternative(lines, datePattern, amountPattern);
  }

  // Parsiraj svaku kandidat liniju
  for (const candidate of candidateLines) {
    const { lineIndex, line, dates, amounts } = candidate;
    
    // Koristi prvi datum
    const valueDate = dates[0];
    
    // Pronađi opis - pokušaj u retku i okolnim redovima
    let description = findDescription(line, lineIndex, lines, valueDate);
    
    // Za svaki iznos, kreiraj transakciju
    for (const amount of amounts) {
      const amountValue = parseAmountString(amount);
      
      // Odredi tip - provjeri kontekst retka
      let type = determineTypeFromContext(line, amount, amountValue, candidateLines);
      
      transactions.push({
        date: formatDate(valueDate),
        description: description,
        amount: amountValue,
        originalAmountStr: amount,
        type: type,
        reference: null
      });
      
      console.log(`✅ Transaction: ${valueDate} - ${description.substring(0, 50)} - ${amount} (${type})`);
    }
  }

  console.log(`✅ Total transactions parsed: ${transactions.length}`);
  return transactions;
};

// Alternativno parsiranje - traži bilo koji datum i iznos u blizini
function parseAlternative(lines, datePattern, amountPattern) {
  const transactions = [];
  
  console.log('Trying alternative parsing method...');
  
  // Pronađi sve datume i iznose u dokumentu
  const allDates = [];
  const allAmounts = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;

    const dates = [...line.matchAll(datePattern)].map(m => ({ date: m[1], lineIndex: i, line: line }));
    const amounts = [...line.matchAll(amountPattern)].map(m => ({ amount: m[1], lineIndex: i, line: line }));
    
    allDates.push(...dates);
    allAmounts.push(...amounts);
  }

  console.log(`Found ${allDates.length} dates and ${allAmounts.length} amounts`);

  // Poveži datume i iznose koji su blizu (unutar 10 redaka)
  for (const dateInfo of allDates) {
    const nearbyAmounts = allAmounts.filter(a => 
      Math.abs(a.lineIndex - dateInfo.lineIndex) <= 10
    );

    if (nearbyAmounts.length > 0) {
      // Pronađi opis u blizini
      let description = '';
      const startLine = Math.max(0, dateInfo.lineIndex - 5);
      const endLine = Math.min(lines.length - 1, dateInfo.lineIndex + 5);
      
      for (let i = startLine; i <= endLine; i++) {
        const line = lines[i];
        if (!line || line.length < 10) continue;
        
        // Provjeri je li ovo opis (sadrži slova, nije datum, nije iznos)
        if (!datePattern.test(line) && 
            !amountPattern.test(line) &&
            !line.toLowerCase().includes('rbr') &&
            !line.toLowerCase().includes('račun') &&
            !line.toLowerCase().includes('referenca') &&
            !line.toLowerCase().includes('datum') &&
            !line.toLowerCase().includes('zagreb') && // Preskoči adrese
            !line.toLowerCase().includes('hrvatska') &&
            /[A-Za-z]{4,}/.test(line) &&
            line.length < 200) {
          description = line.trim();
          break;
        }
      }

      if (!description) {
        description = 'Transakcija';
      }

      // Kreiraj transakciju za svaki iznos u blizini
      for (const amountInfo of nearbyAmounts) {
        const amountValue = parseAmountString(amountInfo.amount);
        const type = amountValue > 100 ? 'prihod' : 'rashod';
        
        transactions.push({
          date: formatDate(dateInfo.date),
          description: description,
          amount: amountValue,
          originalAmountStr: amountInfo.amount,
          type: type,
          reference: null
        });
      }
    }
  }

  // Ukloni duplikate
  const unique = [];
  const seen = new Set();
  
  transactions.forEach(t => {
    const key = `${t.date}-${t.amount}-${t.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  });

  console.log(`✅ Alternative method found ${unique.length} unique transactions`);
  return unique;
}

// Pronađi opis transakcije
function findDescription(line, lineIndex, allLines, valueDate) {
  let description = '';
  
  // Pokušaj pronaći opis u retku (dio prije datuma)
  const dateIndex = line.indexOf(valueDate);
  if (dateIndex > 0) {
    const beforeDate = line.substring(0, dateIndex).trim();
    
    // Ukloni HR brojeve, reference, brojeve
    const textParts = beforeDate.split(/\s+/).filter(part => {
      return !/^HR\d+$/.test(part) && 
             !/^\d{10,}$/.test(part) && 
             !/^[A-Z]{2}\d+/.test(part) &&
             part.length > 2 &&
             !/^\d+$/.test(part) &&
             !/^\d+\.\d+\.\d+$/.test(part) &&
             !part.toLowerCase().includes('zagreb') &&
             !part.toLowerCase().includes('hrvatska');
    });
    
    if (textParts.length > 0) {
      description = textParts.join(' ');
    }
  }
  
  // Ako nema opisa, pokušaj u prethodnim redovima
  if (!description || description.length < 5) {
    for (let j = Math.max(0, lineIndex - 10); j < lineIndex; j++) {
      if (j < 0 || j >= allLines.length) continue;
      
      const prevLine = allLines[j];
      if (!prevLine || prevLine.length < 10) continue;
      
      // Preskoči očito ne-opise
      if (datePattern.test(prevLine) || 
          amountPattern.test(prevLine) ||
          prevLine.toLowerCase().includes('rbr') ||
          prevLine.toLowerCase().includes('račun') ||
          prevLine.toLowerCase().includes('naziv') ||
          prevLine.toLowerCase().includes('referenca') ||
          prevLine.toLowerCase().includes('datum') ||
          prevLine.toLowerCase().includes('isplata') ||
          prevLine.toLowerCase().includes('uplata')) {
        continue;
      }
      
      // Provjeri je li ovo opis (sadrži slova)
      if (/[A-Za-z]{4,}/.test(prevLine) && prevLine.length < 300) {
        // Provjeri nije li to samo adresa
        if (!prevLine.match(/^\d+/) && // Ne počinje s brojem
            !prevLine.toLowerCase().includes('ulica') &&
            !prevLine.toLowerCase().includes('zagreb') &&
            !prevLine.toLowerCase().includes('hrvatska')) {
          description = prevLine.trim();
          break;
        }
      }
    }
  }
  
  if (!description || description.length < 3) {
    description = 'Transakcija';
  }
  
  return description;
}

// Odredi tip transakcije iz konteksta
function determineTypeFromContext(line, amount, amountValue, allCandidates) {
  const lineLower = line.toLowerCase();
  
  // Provjeri eksplicitne oznake u retku
  if (lineLower.includes('isplata') || lineLower.includes('duguje')) {
    return 'rashod';
  }
  if (lineLower.includes('uplata') || lineLower.includes('potražuje')) {
    return 'prihod';
  }
  
  // Heuristika: veći iznosi su obično prihodi
  if (amountValue > 500) {
    return 'prihod';
  }
  if (amountValue < 50) {
    return 'rashod';
  }
  
  // Ako je iznos u desnoj polovici retka, možda je prihod
  const amountIndex = line.indexOf(amount);
  const lineLength = line.length;
  if (amountIndex > lineLength / 2) {
    return 'prihod';
  }
  
  // Default: rashod
  return 'rashod';
}

// Formatiranje datuma u YYYY-MM-DD format
const formatDate = (dateStr) => {
  try {
    const [day, month, year] = dateStr.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting date:', dateStr, error);
    return new Date().toISOString().split('T')[0];
  }
};

// Parsiranje iznosa iz stringa - podržava hrvatski format (1.234,56)
const parseAmountString = (amountStr) => {
  if (!amountStr) return 0;
  
  let cleaned = amountStr.replace(/\s/g, '');
  const isNegative = cleaned.startsWith('-');
  if (isNegative) {
    cleaned = cleaned.substring(1);
  }
  
  // Hrvatski format: 1.234,56
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    console.error('Error parsing amount:', amountStr);
    return 0;
  }
  
  return Math.abs(amount);
};

// Parsiranje iznosa (zadržava predznak za određivanje tipa)
const parseAmount = (amountOrStr) => {
  if (typeof amountOrStr === 'string') {
    return parseAmountString(amountOrStr);
  }
  return Math.abs(amountOrStr);
};

// Određivanje tipa transakcije
const determineTransactionType = (amount) => {
  return amount < 0 ? 'rashod' : 'prihod';
};

// Automatska kategorizacija transakcija
const categorizeTransaction = (description, amount, transactionType = null) => {
  return new Promise((resolve) => {
    const dbInstance = db.getDb();
    const type = transactionType || 'rashod';
    const descLower = description.toLowerCase();

    dbInstance.all(
      'SELECT name, keywords FROM categories WHERE type = ?',
      [type],
      (err, categories) => {
        if (err) {
          console.error('Error fetching categories:', err);
          resolve(type === 'prihod' ? 'Ostali prihodi' : 'Ostali rashodi');
          return;
        }

        for (const category of categories) {
          if (category.keywords) {
            const keywords = category.keywords.split(',').map(k => k.trim().toLowerCase());
            if (keywords.some(keyword => descLower.includes(keyword))) {
              resolve(category.name);
              return;
            }
          }
        }

        resolve(type === 'prihod' ? 'Ostali prihodi' : 'Ostali rashodi');
      }
    );
  });
};

module.exports = {
  parseBankStatement,
  categorizeTransaction,
  formatDate,
  parseAmount,
  parseAmountString,
  determineTransactionType
};
