const express = require('express');
const db = require('../database');

const router = express.Router();

// Baza podataka udaljenosti gradova od Zagreba (u km)
const DISTANCES = {
  // Hrvatska - glavni gradovi
  'Zagreb': 0,
  'Split': 380,
  'Rijeka': 160,
  'Osijek': 280,
  'Zadar': 290,
  'Pula': 260,
  'Dubrovnik': 600,
  'Karlovac': 55,
  'Varaždin': 80,
  'Sisak': 60,
  'Slavonski Brod': 200,
  'Velika Gorica': 15,
  'Šibenik': 350,
  'Vir': 310,
  'Biograd na Moru': 300,
  'Nin': 305,
  'Novalja': 330,
  'Pag': 320,
  
  // Inozemstvo - Europa
  'Beč, Austrija': 380,
  'Salzburg, Austrija': 420,
  'Graz, Austrija': 280,
  'Ljubljana, Slovenija': 140,
  'Maribor, Slovenija': 130,
  'Budimpešta, Mađarska': 350,
  'Prag, Češka': 680,
  'Bratislava, Slovačka': 400,
  'Beograd, Srbija': 400,
  'Sarajevo, BiH': 400,
  'Mostar, BiH': 450,
  'Podgorica, Crna Gora': 650,
  'München, Njemačka': 600,
  'Berlin, Njemačka': 950,
  'Frankfurt, Njemačka': 850,
  'Milano, Italija': 580,
  'Rim, Italija': 900,
  'Venecija, Italija': 400,
  'Trst, Italija': 250,
  'Pariz, Francuska': 1400,
  'London, UK': 1700,
  'Brisel, Belgija': 1300,
  'Amsterdam, Nizozemska': 1350,
  'Madrid, Španjolska': 2000,
  'Barcelona, Španjolska': 1500
};

// Matrica udaljenosti između gradova (u km)
const DISTANCES_BETWEEN = {
  'Zadar-Vir': 25,
  'Vir-Zadar': 25,
  'Zadar-Šibenik': 70,
  'Šibenik-Zadar': 70,
  'Vir-Šibenik': 85,
  'Šibenik-Vir': 85,
  'Split-Šibenik': 90,
  'Šibenik-Split': 90,
  'Split-Zadar': 160,
  'Zadar-Split': 160,
  'Rijeka-Pula': 100,
  'Pula-Rijeka': 100,
  'Split-Dubrovnik': 230,
  'Dubrovnik-Split': 230,
  'Zadar-Pag': 70,
  'Pag-Zadar': 70,
  'Pag-Novalja': 20,
  'Novalja-Pag': 20,
};

// Funkcija za izračun udaljenosti između dva grada
function getDistanceBetween(city1, city2) {
  const key = `${city1}-${city2}`;
  
  // Provjeri postoji li direktna veza
  if (DISTANCES_BETWEEN[key]) {
    return DISTANCES_BETWEEN[key];
  }
  
  // Ako je isti grad
  if (city1 === city2) {
    return 0;
  }
  
  // Aproksimacija preko Zagreba (nije uvijek točno, ali bolje nego ništa)
  const dist1 = DISTANCES[city1] || 0;
  const dist2 = DISTANCES[city2] || 0;
  
  // Ako oba grada imaju udaljenost od Zagreba, aproksimacija
  if (dist1 && dist2) {
    // Približan izračun - nije potpuno točan ali dovoljno dobar
    return Math.abs(dist1 - dist2);
  }
  
  return 0;
}

// Funkcija za izračun ukupne kilometraže rute
function calculateTotalDistance(destinations) {
  if (!destinations || destinations.length === 0) {
    return 0;
  }
  
  // Ako je samo jedna destinacija, povratna od Zagreba
  if (destinations.length === 1) {
    const dist = DISTANCES[destinations[0]] || 0;
    return dist * 2; // povratno
  }
  
  // Više destinacija - izračunaj rutu
  let totalDistance = 0;
  
  // Od Zagreba do prve destinacije
  totalDistance += DISTANCES[destinations[0]] || 0;
  
  // Između destinacija
  for (let i = 0; i < destinations.length - 1; i++) {
    const dist = getDistanceBetween(destinations[i], destinations[i + 1]);
    totalDistance += dist;
  }
  
  // Od zadnje destinacije natrag u Zagreb
  totalDistance += DISTANCES[destinations[destinations.length - 1]] || 0;
  
  return totalDistance;
}

// Dnevnice prema hrvatskom zakonu (2025) - u EUR
// Temeljem Pravilnika o porezu na dohodak
const DNEVNICE = {
  'hrvatska': {
    '8-12h': 15.00,   // put kraći od 12 sati
    '12h+': 30.00,    // put duži od 12 sati (punodnevna dnevnica)
    'obrok_jedan': 0.30,   // umanjenje za 1 obrok (30%)
    'obrok_dva': 0.60      // umanjenje za 2 obroka (60%)
  },
  'inozemstvo': {
    // Za inozemstvo se dnevnice definiraju po državama
    // Ovdje koristimo prosječne iznose za EU
    '12h-': 35.00,    // kraće od 12h (50% pune dnevnice)
    '12h+': 70.00,    // duže od 12h (punodnevna dnevnica)
    'obrok_jedan': 0.30,
    'obrok_dva': 0.60
  }
};

// Naknada za km (2025) - u EUR
// Neoporeziva naknada prema Zakonu o porezu na dohodak
const KM_NAKNADA = 0.50; // EUR po km

// GET /api/travel-orders - Dohvati sve putne naloge
router.get('/', (req, res) => {
  const { year, month } = req.query;
  const dbInstance = db.getDb();

  let query = 'SELECT * FROM travel_orders WHERE 1=1';
  const params = [];

  if (year) {
    query += ' AND strftime("%Y", departure_date) = ?';
    params.push(year);
  }

  if (month) {
    query += ' AND strftime("%m", departure_date) = ?';
    params.push(month.padStart(2, '0'));
  }

  query += ' ORDER BY departure_date DESC';

  dbInstance.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching travel orders:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju putnih naloga' });
    }
    res.json(rows);
  });
});

// GET /api/travel-orders/:id - Dohvati pojedini putni nalog
router.get('/:id', (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.get('SELECT * FROM travel_orders WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('Error fetching travel order:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju putnog naloga' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Putni nalog nije pronađen' });
    }
    res.json(row);
  });
});

// POST /api/travel-orders/calculate - Izračunaj putni nalog
router.post('/calculate', (req, res) => {
  const { destinations, country, departureDate, returnDate, accommodation } = req.body;

  if (!destinations || destinations.length === 0 || !departureDate || !returnDate) {
    return res.status(400).json({ error: 'Nedostaju obavezni podaci' });
  }

  try {
    // Odredi je li inozemstvo
    const isAbroad = country && country !== 'Hrvatska';
    
    // Izračunaj ukupnu kilometražu za sve destinacije
    const totalDistance = calculateTotalDistance(destinations);
    
    // Izračunaj broj dana i sati
    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);
    const diffMs = returnD - departure;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    // Izračunaj dnevnice prema zakonskim propisima
    let dailyAllowance = 0;
    const rates = isAbroad ? DNEVNICE.inozemstvo : DNEVNICE.hrvatska;
    
    if (isAbroad) {
      // INOZEMSTVO
      if (diffHours < 12) {
        // Kraće od 12h = 50% pune dnevnice
        dailyAllowance = rates['12h-'];
      } else {
        // 12h i više
        const fullDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        
        // Puni dani
        dailyAllowance = fullDays * rates['12h+'];
        
        // Preostali dio (ako je 12h ili više)
        if (remainingHours >= 12) {
          dailyAllowance += rates['12h+'];
        } else if (remainingHours > 0) {
          dailyAllowance += rates['12h-'];
        }
      }
    } else {
      // HRVATSKA
      if (diffHours < 8) {
        // Nema prava na dnevnicu
        dailyAllowance = 0;
      } else if (diffHours < 12) {
        // 8-12h = poludnevna dnevnica (15 EUR)
        dailyAllowance = rates['8-12h'];
      } else {
        // 12h i više
        const fullDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        
        // Puni dani (24h)
        dailyAllowance = fullDays * rates['12h+'];
        
        // Preostali dio
        if (remainingHours >= 12) {
          dailyAllowance += rates['12h+'];
        } else if (remainingHours >= 8) {
          dailyAllowance += rates['8-12h'];
        }
      }
    }
    
    // Umanji za obroke ako je osigurano
    // accommodation = broj osiguranih obroka (0, 1, ili 2 po danu)
    if (accommodation && diffDays > 0) {
      // Pretpostavljamo 1 obrok osiguran = 30% umanjenja
      const mealDeduction = dailyAllowance * rates.obrok_jedan;
      dailyAllowance = Math.max(0, dailyAllowance - mealDeduction);
    }
    
    // Izračunaj naknadu za km
    const travelAllowance = totalDistance * KM_NAKNADA;
    
    // Ukupan iznos
    const totalAmount = dailyAllowance + travelAllowance;
    
    // Kreiraj string destinacija
    const destinationString = destinations.join(' → ');
    
    // Kreiraj popis rute sa udaljenostima
    const routeDetails = [];
    if (destinations.length === 1) {
      routeDetails.push({
        from: 'Zagreb',
        to: destinations[0],
        distance: DISTANCES[destinations[0]] || 0
      });
      routeDetails.push({
        from: destinations[0],
        to: 'Zagreb',
        distance: DISTANCES[destinations[0]] || 0
      });
    } else {
      // Od Zagreba do prve destinacije
      routeDetails.push({
        from: 'Zagreb',
        to: destinations[0],
        distance: DISTANCES[destinations[0]] || 0
      });
      
      // Između destinacija
      for (let i = 0; i < destinations.length - 1; i++) {
        routeDetails.push({
          from: destinations[i],
          to: destinations[i + 1],
          distance: getDistanceBetween(destinations[i], destinations[i + 1])
        });
      }
      
      // Od zadnje destinacije natrag u Zagreb
      routeDetails.push({
        from: destinations[destinations.length - 1],
        to: 'Zagreb',
        distance: DISTANCES[destinations[destinations.length - 1]] || 0
      });
    }
    
    res.json({
      destination: destinationString,
      destinations: destinations,
      country: country || 'Hrvatska',
      isAbroad,
      distance: totalDistance,
      roundTripDistance: totalDistance,
      routeDetails: routeDetails,
      departureDate,
      returnDate,
      durationHours: diffHours,
      durationDays: diffDays,
      dailyAllowance: parseFloat(dailyAllowance.toFixed(2)),
      travelAllowance: parseFloat(travelAllowance.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      accommodation,
      currency: 'EUR'
    });
  } catch (error) {
    console.error('Error calculating travel order:', error);
    res.status(500).json({ error: 'Greška pri izračunu putnog naloga' });
  }
});

// POST /api/travel-orders - Kreiraj novi putni nalog
router.post('/', (req, res) => {
  const {
    employee_name,
    destination,
    country,
    departure_date,
    return_date,
    distance,
    round_trip_distance,
    duration_hours,
    duration_days,
    daily_allowance,
    travel_allowance,
    total_amount,
    accommodation,
    purpose,
    notes
  } = req.body;

  if (!employee_name || !destination || !departure_date || !return_date) {
    return res.status(400).json({ error: 'Nedostaju obavezni podaci' });
  }

  const dbInstance = db.getDb();
  dbInstance.run(
    `INSERT INTO travel_orders (
      employee_name, destination, country, departure_date, return_date,
      distance, round_trip_distance, duration_hours, duration_days,
      daily_allowance, travel_allowance, total_amount,
      accommodation, purpose, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee_name, destination, country || 'Hrvatska', departure_date, return_date,
      distance, round_trip_distance, duration_hours, duration_days,
      daily_allowance, travel_allowance, total_amount,
      accommodation ? 1 : 0, purpose, notes
    ],
    function(err) {
      if (err) {
        console.error('Error creating travel order:', err);
        return res.status(500).json({ error: 'Greška pri kreiranju putnog naloga' });
      }
      res.status(201).json({
        id: this.lastID,
        message: 'Putni nalog uspješno kreiran'
      });
    }
  );
});

// PUT /api/travel-orders/:id - Ažuriraj putni nalog
router.put('/:id', (req, res) => {
  const {
    employee_name,
    destination,
    country,
    departure_date,
    return_date,
    distance,
    round_trip_distance,
    duration_hours,
    duration_days,
    daily_allowance,
    travel_allowance,
    total_amount,
    accommodation,
    purpose,
    notes
  } = req.body;

  const dbInstance = db.getDb();
  dbInstance.run(
    `UPDATE travel_orders SET
      employee_name = ?, destination = ?, country = ?, departure_date = ?, return_date = ?,
      distance = ?, round_trip_distance = ?, duration_hours = ?, duration_days = ?,
      daily_allowance = ?, travel_allowance = ?, total_amount = ?,
      accommodation = ?, purpose = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      employee_name, destination, country, departure_date, return_date,
      distance, round_trip_distance, duration_hours, duration_days,
      daily_allowance, travel_allowance, total_amount,
      accommodation ? 1 : 0, purpose, notes,
      req.params.id
    ],
    function(err) {
      if (err) {
        console.error('Error updating travel order:', err);
        return res.status(500).json({ error: 'Greška pri ažuriranju putnog naloga' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Putni nalog nije pronađen' });
      }
      res.json({ message: 'Putni nalog uspješno ažuriran' });
    }
  );
});

// DELETE /api/travel-orders/:id - Obriši putni nalog
router.delete('/:id', (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.run('DELETE FROM travel_orders WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('Error deleting travel order:', err);
      return res.status(500).json({ error: 'Greška pri brisanju putnog naloga' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Putni nalog nije pronađen' });
    }
    res.json({ message: 'Putni nalog uspješno obrisan' });
  });
});

// GET /api/travel-orders/destinations/list - Dohvati listu destinacija
router.get('/destinations/list', (req, res) => {
  const destinations = Object.keys(DISTANCES).map(dest => {
    const parts = dest.split(', ');
    return {
      name: parts[0],
      country: parts[1] || 'Hrvatska',
      distance: DISTANCES[dest]
    };
  });
  res.json(destinations);
});

module.exports = router;

