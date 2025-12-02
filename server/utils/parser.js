const { format, parse, isValid } = require('date-fns');
const { hr } = require('date-fns/locale');
const db = require('../database');

// Parsiranje bankovnog izvoda iz PDF teksta
// Prilagođeno za format Privredne banke Zagreb s kolonama Isplata/Uplata
const parseBankStatement = (pdfText) => {
  const transactions = [];
  
  if (!pdfText || pdfText.length < 100) {
    console.log('PDF tekst je prekratak ili prazan');
    return transactions;
  }

  // Normaliziraj tekst - zamijeni višestruke razmake s jednim
  const normalizedText = pdfText.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  console.log(`Total lines in PDF: ${lines.length}`);
  
  // Pattern za datum u formatu DD.MM.YYYY
  const datePattern = /(\d{1,2}\.\d{1,2}\.\d{4})/;
  
  // Pattern za iznose u hrvatskom formatu (npr. 2.500,00 ili 16,85)
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;
  
  // Traži početak tablice transakcija - pokušaj više načina
  let headerLineIndex = -1;
  let headerLine = '';
  
  // Metoda 1: Traži eksplicitni header s "Isplata" i "Uplata"
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if ((lineLower.includes('isplata') || lineLower.includes('duguje')) && 
        (lineLower.includes('uplata') || lineLower.includes('potražuje'))) {
      headerLineIndex = i;
      headerLine = lines[i];
      console.log(`Found header at line ${i + 1}: ${headerLine.substring(0, 200)}`);
      break;
    }
  }
  
  // Metoda 2: Ako nije pronađen, traži retke s "Datum valute" ili "Datum izvršenja"
  if (headerLineIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if ((lineLower.includes('datum valute') || lineLower.includes('datum izvršenja')) &&
          (lineLower.includes('isplata') || lineLower.includes('uplata'))) {
        headerLineIndex = i;
        headerLine = lines[i];
        console.log(`Found alternative header at line ${i + 1}`);
        break;
      }
    }
  }
  
  // Metoda 3: Ako još nije pronađen, traži retke koji sadrže "RBR" i iznose
  if (headerLineIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.includes('rbr') && amountPattern.test(lines[i])) {
        // Provjeri je li sljedeći redak header
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].toLowerCase();
          if (nextLine.includes('isplata') || nextLine.includes('uplata')) {
            headerLineIndex = i + 1;
            headerLine = lines[i + 1];
            console.log(`Found header after RBR at line ${i + 2}`);
            break;
          }
        }
      }
    }
  }
  
  if (headerLineIndex === -1) {
    console.log('Nije pronađen header tablice - pokušavam alternativno parsiranje');
    // Pokušaj parsirati bez headera - traži retke s datumom i iznosom
    return parseWithoutHeader(lines, datePattern, amountPattern);
  }
  
  // Pronađi pozicije kolona u headeru
  const headerLower = headerLine.toLowerCase();
  const isplataIndex = headerLower.indexOf('isplata') !== -1 ? 
    headerLower.indexOf('isplata') : 
    (headerLower.indexOf('duguje') !== -1 ? headerLower.indexOf('duguje') : -1);
  const uplataIndex = headerLower.indexOf('uplata') !== -1 ? 
    headerLower.indexOf('uplata') : 
    (headerLower.indexOf('potražuje') !== -1 ? headerLower.indexOf('potražuje') : -1);
  
  console.log(`Header positions - Isplata: ${isplataIndex}, Uplata: ${uplataIndex}`);
  
  // Parsiraj retke nakon headera
  let transactionCount = 0;
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Preskoči prazne linije
    if (!line || line.length < 5) continue;
    
    // Provjeri je li ovo kraj tablice
    if (line.includes('***') || line.toLowerCase().includes('kraj') || 
        line.toLowerCase().includes('ukupno') || line.toLowerCase().includes('stanje')) {
      console.log(`End of table detected at line ${i + 1}`);
      break;
    }
    
    // Pronađi sve datume u retku
    const dates = line.match(new RegExp(datePattern.source, 'g'));
    if (!dates || dates.length === 0) {
      // Možda je opis u zasebnom retku - preskoči za sada
      continue;
    }
    
    // Pronađi sve iznose u retku
    const amounts = [];
    let match;
    const amountRegex = new RegExp(amountPattern.source);
    let searchLine = line;
    
    while ((match = amountRegex.exec(searchLine)) !== null) {
      amounts.push(match[1]);
    }
    
    if (amounts.length === 0) continue;
    
    // Pronađi datum valute (obično prvi datum)
    const valueDate = dates[0];
    
    // Pronađi opis transakcije
    let description = extractDescription(line, dates[0], lines, i, headerLineIndex);
    
    // Odredi koji iznos pripada kojoj koloni
    let debitAmount = null;  // Isplata (rashod)
    let creditAmount = null; // Uplata (prihod)
    
    if (amounts.length === 1) {
      // Samo jedan iznos - provjeri poziciju
      const amountIndex = line.indexOf(amounts[0]);
      const lineLength = line.length;
      
      if (isplataIndex !== -1 && uplataIndex !== -1) {
        const distToIsplata = Math.abs(amountIndex - isplataIndex);
        const distToUplata = Math.abs(amountIndex - uplataIndex);
        
        if (distToIsplata < distToUplata) {
          debitAmount = amounts[0];
        } else {
          creditAmount = amounts[0];
        }
      } else {
        // Ako ne možemo odrediti, provjeri poziciju u retku
        if (amountIndex < lineLength / 2) {
          debitAmount = amounts[0];
        } else {
          creditAmount = amounts[0];
        }
      }
    } else if (amounts.length >= 2) {
      // Dva ili više iznosa - prvi je obično Isplata, zadnji Uplata
      // Ili provjeri pozicije
      if (isplataIndex !== -1 && uplataIndex !== -1) {
        for (const amount of amounts) {
          const amountIndex = line.indexOf(amount);
          const distToIsplata = Math.abs(amountIndex - isplataIndex);
          const distToUplata = Math.abs(amountIndex - uplataIndex);
          
          if (distToIsplata < distToUplata && !debitAmount) {
            debitAmount = amount;
          } else if (distToUplata < distToIsplata && !creditAmount) {
            creditAmount = amount;
          }
        }
      } else {
        // Koristi redoslijed
        debitAmount = amounts[0];
        if (amounts.length > 1) {
          creditAmount = amounts[amounts.length - 1];
        }
      }
    }
    
    // Kreiraj transakcije
    if (debitAmount) {
      transactions.push({
        date: formatDate(valueDate),
        description: description,
        amount: parseAmountString(debitAmount),
        originalAmountStr: debitAmount,
        type: 'rashod',
        reference: null
      });
      transactionCount++;
    }
    
    if (creditAmount) {
      transactions.push({
        date: formatDate(valueDate),
        description: description,
        amount: parseAmountString(creditAmount),
        originalAmountStr: creditAmount,
        type: 'prihod',
        reference: null
      });
      transactionCount++;
    }
  }

  console.log(`Parsed ${transactionCount} transactions from table`);
  return transactions;
};

// Alternativno parsiranje bez headera - traži retke s datumom i iznosom
function parseWithoutHeader(lines, datePattern, amountPattern) {
  const transactions = [];
  console.log('Attempting to parse without header...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line || line.length < 10) continue;
    
    // Pronađi datume
    const dates = line.match(new RegExp(datePattern.source, 'g'));
    if (!dates || dates.length === 0) continue;
    
    // Pronađi iznose
    const amounts = [];
    let match;
    const amountRegex = new RegExp(amountPattern.source);
    
    while ((match = amountRegex.exec(line)) !== null) {
      amounts.push(match[1]);
    }
    
    if (amounts.length === 0) continue;
    
    // Pronađi opis
    const valueDate = dates[0];
    let description = extractDescription(line, valueDate, lines, i, 0);
    
    // Za svaki iznos, kreiraj transakciju
    // Pretpostavimo da su veći iznosi prihodi, manji rashodi
    for (const amount of amounts) {
      const amountValue = parseAmountString(amount);
      const type = amountValue > 1000 ? 'prihod' : 'rashod'; // Heuristika
      
      transactions.push({
        date: formatDate(valueDate),
        description: description,
        amount: amountValue,
        originalAmountStr: amount,
        type: type,
        reference: null
      });
    }
  }
  
  console.log(`Parsed ${transactions.length} transactions without header`);
  return transactions;
}

// Ekstraktiraj opis transakcije
function extractDescription(line, firstDate, allLines, currentIndex, headerIndex) {
  let description = '';
  
  // Pokušaj pronaći opis u retku (dio prije datuma)
  const firstDateIndex = line.indexOf(firstDate);
  if (firstDateIndex > 0) {
    const beforeDate = line.substring(0, firstDateIndex).trim();
    
    // Ukloni IBAN-ove, reference, brojeve
    const textParts = beforeDate.split(/\s+/).filter(part => {
      return !/^HR\d+$/.test(part) && 
             !/^\d{10,}$/.test(part) && 
             !/^[A-Z]{2}\d+/.test(part) &&
             part.length > 2 &&
             !/^\d+$/.test(part);
    });
    
    if (textParts.length > 0) {
      description = textParts.join(' ');
    }
  }
  
  // Ako nema opisa, pokušaj u prethodnim redovima
  if (!description || description.length < 5) {
    for (let j = Math.max(headerIndex + 1, currentIndex - 5); j < currentIndex; j++) {
      if (j < 0 || j >= allLines.length) continue;
      
      const prevLine = allLines[j];
      if (!prevLine || prevLine.length < 10) continue;
      
      // Provjeri je li ovo opis (sadrži slova, nije datum, nije iznos)
      if (!datePattern.test(prevLine) && 
          !amountPattern.test(prevLine) &&
          !prevLine.toLowerCase().includes('rbr') &&
          !prevLine.toLowerCase().includes('račun') &&
          !prevLine.toLowerCase().includes('naziv') &&
          !prevLine.toLowerCase().includes('referenca') &&
          /[A-Za-z]{4,}/.test(prevLine)) {
        description = prevLine.trim();
        break;
      }
    }
  }
  
  // Ako još uvijek nema opisa, koristi default
  if (!description || description.length < 3) {
    description = 'Transakcija';
  }
  
  return description;
}

// Formatiranje datuma u YYYY-MM-DD format
const formatDate = (dateStr) => {
  try {
    // Pretpostavljamo format DD.MM.YYYY
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
  
  // Ukloni sve razmake
  let cleaned = amountStr.replace(/\s/g, '');
  
  // Provjeri predznak
  const isNegative = cleaned.startsWith('-');
  if (isNegative) {
    cleaned = cleaned.substring(1);
  }
  
  // Hrvatski format: 1.234,56 (točka za tisućice, zarez za decimale)
  // Ukloni točke (separatori tisućica) i zamijeni zarez s točkom
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    console.error('Error parsing amount:', amountStr);
    return 0;
  }
  
  // Vrati apsolutnu vrijednost (predznak određujemo preko kolone)
  return Math.abs(amount);
};

// Parsiranje iznosa (zadržava predznak za određivanje tipa)
const parseAmount = (amountOrStr) => {
  // Ako je string, parsiraj ga
  if (typeof amountOrStr === 'string') {
    return parseAmountString(amountOrStr);
  }
  // Ako je broj, vrati apsolutnu vrijednost
  return Math.abs(amountOrStr);
};

// Određivanje tipa transakcije - više se ne koristi jer određujemo preko kolone
const determineTransactionType = (amount) => {
  return amount < 0 ? 'rashod' : 'prihod';
};

// Automatska kategorizacija transakcija
const categorizeTransaction = (description, amount, transactionType = null) => {
  return new Promise((resolve) => {
    const dbInstance = db.getDb();
    // Koristimo transactionType ako je naveden
    const type = transactionType || 'rashod';
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
  parseAmount,
  parseAmountString,
  determineTransactionType
};
