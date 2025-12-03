const { format, parse, isValid } = require('date-fns');
const { hr } = require('date-fns/locale');
const db = require('../database');

// Parsiranje bankovnog izvoda Privredne banke Zagreb
// Struktura: RBR → HR račun → Naziv → Adresa → Opis → Datumi → Iznos
const parseBankStatement = (pdfText) => {
  const transactions = [];
  
  if (!pdfText || pdfText.length < 100) {
    console.log('❌ PDF tekst je prekratak ili prazan');
    return transactions;
  }

  console.log('=== PARSING PDF - PBZ FORMAT ===');
  console.log('PDF text length:', pdfText.length);

  // Split po redovima
  const lines = pdfText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  console.log(`Total lines in PDF: ${lines.length}`);

  // Pattern za prepoznavanje strukturnih elemenata
  const rbrPattern = /^(\d+)\.HR\d+/; // RBR s HR računom (npr. "1.HR1210010051863000160")
  const datePattern = /(\d{2}\.\d{2}\.\d{4})/g;
  const amountPattern = /^(\d{1,3}(?:\.\d{3})*,\d{2})$/; // Iznos na kraju u posebnom retku

  // Pronađi header s kolonama Isplata/Uplata
  let isplataColumnIndex = -1;
  let uplataColumnIndex = -1;
  
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('isplata') || line.includes('duguje')) {
      isplataColumnIndex = i;
      console.log(`Found "Isplata" header at line ${i + 1}`);
    }
    if (line.includes('uplata') || line.includes('potražuje')) {
      uplataColumnIndex = i;
      console.log(`Found "Uplata" header at line ${i + 1}`);
    }
  }

  // Pronađi početak transakcija - nakon header sekcije
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (rbrPattern.test(line)) {
      startIndex = i;
      console.log(`Found first transaction at line ${i + 1}: ${line}`);
      break;
    }
  }

  if (startIndex === -1) {
    console.log('❌ No transactions found - RBR pattern not matched');
    return transactions;
  }

  // Parsiraj transakcije po blokovima
  let i = startIndex;
  let transactionCount = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Provjeri je li kraj izvoda
    if (line.includes('KRAJ') && line.includes('IZVATKA')) {
      console.log(`End of statement at line ${i + 1}`);
      break;
    }

    // Provjeri je li ovo početak transakcije (RBR.HR...)
    const rbrMatch = line.match(rbrPattern);
    if (rbrMatch) {
      transactionCount++;
      console.log(`\n--- Transaction ${transactionCount} starts at line ${i + 1} ---`);
      console.log(`Line: ${line}`);

      // Ekstraktiraj HR račun iz prvog retka
      const hrAccountMatch = line.match(/(HR\d{19,})/);
      const hrAccount = hrAccountMatch ? hrAccountMatch[1] : '';
      
      // Provjeri je li HR račun tvoj (NALANNY) ili tuđi
      const isOwnAccount = hrAccount.includes('2340009111129788'); // Tvoj račun iz PDF-a
      
      let currentLine = i;
      let name = '';
      let address = '';
      let description = '';
      let dates = [];
      let amount = '';
      let allLinesInTransaction = [];

      // Prikupi podatke za ovu transakciju (sljedećih 15-20 redaka)
      for (let j = 1; j < 20 && currentLine + j < lines.length; j++) {
        const nextLine = lines[currentLine + j];
        allLinesInTransaction.push(nextLine);
        
        // Provjeri je li sljedeća transakcija ili kraj
        if (rbrPattern.test(nextLine) || (nextLine.includes('KRAJ') && nextLine.includes('IZVATKA'))) {
          console.log(`Next transaction or end detected at line ${currentLine + j + 1}`);
          i = currentLine + j - 1;
          break;
        }

        // Preskoči separator linije
        if (nextLine.startsWith('___') || nextLine.startsWith('---')) {
          console.log(`Separator at line ${currentLine + j + 1}`);
          i = currentLine + j;
          break;
        }

        // Ekstraktiraj naziv (prvi red nakon HR računa koji nije HR račun/referenca)
        if (!name && nextLine.length > 5 && 
            !nextLine.startsWith('HR') && 
            !/^\d+$/.test(nextLine) &&
            !nextLine.match(/^\d{2}\.\d{2}\.\d{4}$/) &&
            !amountPattern.test(nextLine) &&
            !nextLine.includes('HRVATSKA') &&
            !/^\d{10,}$/.test(nextLine)) {
          name = nextLine;
          console.log(`Name: ${name}`);
          continue;
        }

        // Ekstraktiraj adresu (redovi nakon naziva, prije opisa)
        if (name && !description && nextLine.length > 5 &&
            !nextLine.startsWith('HR') &&
            !/^\d{10,}$/.test(nextLine) &&
            !nextLine.match(/^\d{2}\.\d{2}\.\d{4}$/) &&
            !amountPattern.test(nextLine) &&
            (nextLine.toLowerCase().includes('ulica') || 
             nextLine.toLowerCase().includes('cesta') ||
             nextLine.match(/\d{5}/) || // Poštanski broj
             nextLine === 'HRVATSKA' ||
             nextLine.toLowerCase().includes('zagreb'))) {
          if (address) address += ' ';
          address += nextLine;
          console.log(`Address: ${nextLine}`);
          continue;
        }

        // Ekstraktiraj opis (redak prije datuma, sadrži slova)
        if (name && !description && nextLine.length > 5 &&
            !nextLine.startsWith('HR') &&
            !/^\d{10,}$/.test(nextLine) &&
            !nextLine.match(/^\d{2}\.\d{2}\.\d{4}$/) &&
            !amountPattern.test(nextLine) &&
            !nextLine.includes('HRVATSKA') &&
            /[A-Za-z]{5,}/.test(nextLine)) {
          description = nextLine;
          console.log(`Description: ${description}`);
          continue;
        }

        // Ekstraktiraj datume
        const foundDates = [...nextLine.matchAll(datePattern)].map(m => m[1]);
        if (foundDates.length > 0 && dates.length === 0) {
          dates = foundDates;
          console.log(`Dates: ${dates.join(', ')}`);
          continue;
        }

        // Ekstraktiraj iznos (cijeli redak mora biti iznos)
        if (amountPattern.test(nextLine)) {
          amount = nextLine;
          console.log(`Amount: ${amount}`);
          i = currentLine + j;
          break;
        }
      }

      // Kreiraj transakciju ako ima sve potrebne podatke
      if (dates.length > 0 && amount && (name || description)) {
        const fullDescription = name ? 
          (description ? `${name} - ${description}` : name) : 
          description;

        // POBOLJŠANA LOGIKA ZA ODREĐIVANJE TIPA (prihod/rashod)
        let type = determineTransactionType(
          fullDescription, 
          name, 
          description, 
          hrAccount, 
          isOwnAccount,
          parseAmountString(amount),
          allLinesInTransaction
        );

        const transaction = {
          date: formatDate(dates[0]),
          description: fullDescription.substring(0, 500),
          amount: parseAmountString(amount),
          originalAmountStr: amount,
          type: type,
          reference: hrAccount || null
        };

        transactions.push(transaction);
        console.log(`✅ Transaction added: ${transaction.date} - ${transaction.description.substring(0, 50)} - ${amount} (${type})`);
      } else {
        console.log(`⚠️ Incomplete transaction - dates:${dates.length}, amount:${amount?'yes':'no'}, desc:${name||description?'yes':'no'}`);
      }
    }

    i++;
  }

  console.log(`\n✅ Total transactions parsed: ${transactions.length}`);
  return transactions;
};

// POBOLJŠANA FUNKCIJA ZA ODREĐIVANJE TIPA TRANSAKCIJE
function determineTransactionType(fullDescription, name, description, hrAccount, isOwnAccount, amount, allLines) {
  const descLower = fullDescription.toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const descriptionLower = (description || '').toLowerCase();
  
  console.log(`Determining type for: "${fullDescription.substring(0, 60)}"`);
  console.log(`  - Name: "${name}"`);
  console.log(`  - Description: "${description}"`);
  console.log(`  - HR Account: ${hrAccount}`);
  console.log(`  - Is Own Account: ${isOwnAccount}`);
  console.log(`  - Amount: ${amount}`);
  
  // ===================================================================
  // PRIORITET 1: SPECIFIČNI SLUČAJEVI - NAJVEĆI PRIORITET
  // ===================================================================
  
  // 1a. PRIJENOS TEMELJNOG KAPITALA - uvijek prihod (osnivanje firme)
  if (descLower.includes('prijenos temeljnog kapitala') || 
      descLower.includes('temeljni kapital') ||
      descLower.includes('osnivanje')) {
    console.log('→ Type: PRIHOD (founding capital)');
    return 'prihod';
  }
  
  // 1b. UPLATA/AVANS OD KLIJENATA - uvijek prihod
  if ((descriptionLower.includes('uplata') || descriptionLower.includes('avans')) &&
      (descriptionLower.includes('ponud') || descriptionLower.includes('faktur') || descriptionLower.includes('račun'))) {
    console.log('→ Type: PRIHOD (payment from client)');
    return 'prihod';
  }
  
  // 1c. PLAĆANJE/TRANSFER OD DRUGOG LICA (ne banka, ne država) - prihod
  if (!nameLower.includes('banka') && 
      !nameLower.includes('ministarstvo') && 
      !nameLower.includes('porezna') &&
      !nameLower.includes('republika') &&
      name && name.length > 10) {
    console.log('→ Type: PRIHOD (payment from person/company)');
    return 'prihod';
  }
  
  // ===================================================================
  // PRIORITET 2: BANKOVNE TRANSAKCIJE
  // ===================================================================
  
  if (nameLower.includes('privredna banka') || nameLower.includes('pbz') || nameLower.includes('banka')) {
    // Naknade i provizije banke su uvijek rashodi
    if (descLower.includes('naknada') || 
        descLower.includes('provizija') ||
        descLower.includes('troškovi')) {
      console.log('→ Type: RASHOD (bank fee/commission)');
      return 'rashod';
    }
    
    // Primljene kamate su prihodi
    if ((descLower.includes('kamata') || descLower.includes('kamate')) && 
        (descLower.includes('isplat') || descLower.includes('virman') || descLower.includes('klijentu'))) {
      console.log('→ Type: PRIHOD (interest received)');
      return 'prihod';
    }
  }
  
  // ===================================================================
  // PRIORITET 3: PLAĆANJA DRŽAVI/POREZIMA
  // ===================================================================
  
  if (nameLower.includes('ministarstvo') ||
      nameLower.includes('porezna') ||
      nameLower.includes('republika hrvatska') ||
      descLower.includes('uplata javnih davanja') ||
      descLower.includes('porez') ||
      descLower.includes('doprinos')) {
    
    // ALI - ako je opis "prijenos temeljnog kapitala" ili slično, to je prihod
    if (descLower.includes('prijenos') || descLower.includes('temeljni')) {
      console.log('→ Type: PRIHOD (transfer from government)');
      return 'prihod';
    }
    
    console.log('→ Type: RASHOD (tax/government payment)');
    return 'rashod';
  }
  
  // ===================================================================
  // PRIORITET 4: KLJUČNE RIJEČI U OPISU
  // ===================================================================
  
  // Rashodi - jasni znakovi plaćanja prema van
  const strongExpenseKeywords = [
    'naknada za', 'provizija', 'trošak', 'plaćanje računa',
    'kupio', 'nabava', 'uplata doprinosa', 'uplata poreza'
  ];
  
  // Prihodi - jasni znakovi primanja
  const strongIncomeKeywords = [
    'uplata avansa', 'uplata po', 'plaćanje fakture', 
    'primljeno od', 'prihod od', 'naplata'
  ];
  
  const hasStrongExpense = strongExpenseKeywords.some(kw => descLower.includes(kw));
  const hasStrongIncome = strongIncomeKeywords.some(kw => descLower.includes(kw));
  
  if (hasStrongIncome) {
    console.log('→ Type: PRIHOD (strong income keyword)');
    return 'prihod';
  }
  
  if (hasStrongExpense) {
    console.log('→ Type: RASHOD (strong expense keyword)');
    return 'rashod';
  }
  
  // ===================================================================
  // PRIORITET 5: ANALIZA HR RAČUNA
  // ===================================================================
  
  // Ako je HR račun tvoj = primio si novac = prihod
  if (isOwnAccount) {
    console.log('→ Type: PRIHOD (own account - money received)');
    return 'prihod';
  }
  
  // ===================================================================
  // PRIORITET 6: HEURISTIKA NA OSNOVU IZNOSA
  // ===================================================================
  
  // Veliki iznosi od klijenata su obično prihodi
  if (amount > 100) {
    console.log('→ Type: PRIHOD (amount > 100, likely client payment)');
    return 'prihod';
  }
  
  // Mali iznosi su obično rashodi (naknade, porezi)
  if (amount < 50) {
    console.log('→ Type: RASHOD (small amount < 50)');
    return 'rashod';
  }
  
  // ===================================================================
  // PRIORITET 7: DEFAULT - PRIHOD (jer većina transakcija su primanja)
  // ===================================================================
  console.log('→ Type: PRIHOD (default - most transactions are income)');
  return 'prihod';
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
