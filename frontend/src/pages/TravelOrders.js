import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const TravelOrders = () => {
  const [travelOrders, setTravelOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculation, setCalculation] = useState(null);
  
  const [formData, setFormData] = useState({
    employee_name: '',
    destination: '',
    country: 'Hrvatska',
    departure_date: '',
    return_date: '',
    accommodation: false,
    purpose: '',
    notes: ''
  });

  const [calcData, setCalcData] = useState({
    destinations: [''],
    country: 'Hrvatska',
    departureDate: '',
    returnDate: '',
    accommodation: false
  });

  const destinations = [
    // Hrvatska
    'Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Dubrovnik',
    'Karlovac', 'Varaždin', 'Sisak', 'Slavonski Brod', 'Velika Gorica',
    'Šibenik', 'Vir', 'Biograd na Moru', 'Nin', 'Novalja', 'Pag',
  ];

  const countries = [
    'Hrvatska', 'Austrija', 'Slovenija', 'Mađarska', 'Češka', 'Slovačka',
    'Srbija', 'BiH', 'Crna Gora', 'Njemačka', 'Italija', 'Francuska',
    'UK', 'Belgija', 'Nizozemska', 'Španjolska'
  ];

  useEffect(() => {
    fetchTravelOrders();
  }, []);

  const fetchTravelOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/travel-orders');
      setTravelOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching travel orders:', error);
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    // Filtriraj prazne destinacije
    const validDestinations = calcData.destinations.filter(d => d && d.trim() !== '');
    
    if (validDestinations.length === 0 || !calcData.departureDate || !calcData.returnDate) {
      alert('Molimo ispunite sva obavezna polja');
      return;
    }

    try {
      const response = await axios.post('/api/travel-orders/calculate', {
        destinations: validDestinations,
        country: calcData.country,
        departureDate: calcData.departureDate,
        returnDate: calcData.returnDate,
        accommodation: calcData.accommodation
      });
      setCalculation(response.data);
      
      // Automatski popuni formu s izračunatim podacima
      setFormData({
        ...formData,
        destination: response.data.destination,
        country: response.data.country,
        departure_date: response.data.departureDate,
        return_date: response.data.returnDate,
        accommodation: response.data.accommodation
      });
    } catch (error) {
      console.error('Error calculating travel order:', error);
      alert('Greška pri izračunu putnog naloga');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!calculation) {
      alert('Prvo izračunajte putni nalog');
      return;
    }

    if (!formData.employee_name) {
      alert('Molimo unesite ime zaposlenika');
      return;
    }

    try {
      await axios.post('/api/travel-orders', {
        ...formData,
        distance: calculation.distance,
        round_trip_distance: calculation.roundTripDistance,
        duration_hours: calculation.durationHours,
        duration_days: calculation.durationDays,
        daily_allowance: calculation.dailyAllowance,
        travel_allowance: calculation.travelAllowance,
        total_amount: calculation.totalAmount
      });

      alert('Putni nalog uspješno kreiran');
      setShowForm(false);
      setShowCalculator(false);
      setCalculation(null);
      setFormData({
        employee_name: '',
        destination: '',
        country: 'Hrvatska',
        departure_date: '',
        return_date: '',
        accommodation: false,
        purpose: '',
        notes: ''
      });
      setCalcData({
        destinations: [''],
        country: 'Hrvatska',
        departureDate: '',
        returnDate: '',
        accommodation: false
      });
      fetchTravelOrders();
    } catch (error) {
      console.error('Error creating travel order:', error);
      alert('Greška pri kreiranju putnog naloga');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Jeste li sigurni da želite obrisati ovaj putni nalog?')) {
      try {
        await axios.delete(`/api/travel-orders/${id}`);
        fetchTravelOrders();
      } catch (error) {
        console.error('Error deleting travel order:', error);
        alert('Greška pri brisanju putnog naloga');
      }
    }
  };

  const handleNewTravelOrder = () => {
    setShowCalculator(true);
    setShowForm(false);
    setCalculation(null);
  };

  const handleCalcChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCalcData({
      ...calcData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDestinationChange = (index, value) => {
    const newDestinations = [...calcData.destinations];
    newDestinations[index] = value;
    setCalcData({
      ...calcData,
      destinations: newDestinations
    });
  };

  const addDestination = () => {
    setCalcData({
      ...calcData,
      destinations: [...calcData.destinations, '']
    });
  };

  const removeDestination = (index) => {
    if (calcData.destinations.length > 1) {
      const newDestinations = calcData.destinations.filter((_, i) => i !== index);
      setCalcData({
        ...calcData,
        destinations: newDestinations
      });
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Putni nalozi</h1>
        <button className="btn btn-primary" onClick={handleNewTravelOrder}>
          + Novi putni nalog
        </button>
      </div>

      {/* Kalkulator */}
      {showCalculator && (
        <div className="card">
          <div className="card-header">Izračunaj putni nalog</div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
              Destinacije * (redoslijed putovanja)
            </label>
            {calcData.destinations.map((dest, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ padding: '0.5rem', minWidth: '30px', textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                  {index + 1}.
                </span>
                <input
                  type="text"
                  className="form-control"
                  value={dest}
                  onChange={(e) => handleDestinationChange(index, e.target.value)}
                  list="destinations"
                  placeholder={index === 0 ? "Prva destinacija" : "Sljedeća destinacija"}
                  style={{ flex: 1 }}
                />
                <datalist id="destinations">
                  {destinations.map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                {calcData.destinations.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeDestination(index)}
                    style={{ padding: '0.5rem 0.75rem' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addDestination}
              style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}
            >
              + Dodaj destinaciju
            </button>
          </div>

          <div className="form-group">
            <label>Država *</label>
            <select
              name="country"
              className="form-control"
              value={calcData.country}
              onChange={handleCalcChange}
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Datum polaska *</label>
            <input
              type="datetime-local"
              name="departureDate"
              className="form-control"
              value={calcData.departureDate}
              onChange={handleCalcChange}
            />
          </div>

          <div className="form-group">
            <label>Datum dolaska *</label>
            <input
              type="datetime-local"
              name="returnDate"
              className="form-control"
              value={calcData.returnDate}
              onChange={handleCalcChange}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="accommodation"
                checked={calcData.accommodation}
                onChange={handleCalcChange}
              />
              Obrok osiguran (umanjenje 30%)
            </label>
            <small style={{ color: '#666', fontSize: '0.85rem', marginLeft: '1.5rem' }}>
              Označite ako je osiguran ručak ili večera na putovanju
            </small>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCalculate}
            style={{ marginRight: '0.5rem' }}
          >
            Izračunaj
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowCalculator(false);
              setCalculation(null);
            }}
          >
            Odustani
          </button>

          {/* Prikaz izračuna */}
          {calculation && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Rezultat izračuna:</h3>
              
              {/* Prikaz rute */}
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                <strong>Ruta putovanja:</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  {calculation.routeDetails && calculation.routeDetails.map((route, idx) => (
                    <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {route.from} → {route.to}: <strong>{route.distance} km</strong>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div><strong>Destinacije:</strong></div>
                <div>{calculation.destination}</div>
                
                <div><strong>Ukupna kilometraža:</strong></div>
                <div>{calculation.distance} km</div>
                
                <div><strong>Trajanje:</strong></div>
                <div>{calculation.durationDays} dana, {calculation.durationHours % 24} sati</div>
                
                <div><strong>Dnevnice:</strong></div>
                <div>{calculation.dailyAllowance.toFixed(2)} EUR</div>
                
                <div><strong>Naknada za km:</strong></div>
                <div>{calculation.travelAllowance.toFixed(2)} EUR</div>
                
                <div style={{ borderTop: '2px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>UKUPNO:</strong>
                </div>
                <div style={{ borderTop: '2px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>{calculation.totalAmount.toFixed(2)} EUR</strong>
                </div>
              </div>

              <button
                className="btn btn-success"
                onClick={() => setShowForm(true)}
                style={{ marginTop: '1rem' }}
              >
                Nastavi s kreiranjem putnog naloga
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forma za spremanje */}
      {showForm && calculation && (
        <div className="card">
          <div className="card-header">Kreiranje putnog naloga</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ime i prezime zaposlenika *</label>
              <input
                type="text"
                name="employee_name"
                className="form-control"
                value={formData.employee_name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Svrha putovanja</label>
              <input
                type="text"
                name="purpose"
                className="form-control"
                value={formData.purpose}
                onChange={handleFormChange}
                placeholder="npr. Poslovna konferencija, Sastanak s klijentom..."
              />
            </div>

            <div className="form-group">
              <label>Napomena</label>
              <textarea
                name="notes"
                className="form-control"
                value={formData.notes}
                onChange={handleFormChange}
                rows="3"
              />
            </div>

            <button type="submit" className="btn btn-success" style={{ marginRight: '0.5rem' }}>
              Spremi putni nalog
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Natrag na izračun
            </button>
          </form>
        </div>
      )}

      {/* Tablica putnih naloga */}
      {!showCalculator && !showForm && (
        <div className="card">
          <div className="card-header">Popis putnih naloga</div>
          <table className="table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Zaposlenik</th>
                <th>Destinacija</th>
                <th>Trajanje</th>
                <th>Dnevnice</th>
                <th>Km naknada</th>
                <th>Ukupno</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {travelOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    Nema putnih naloga
                  </td>
                </tr>
              ) : (
                travelOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {format(new Date(order.departure_date), 'dd.MM.yyyy')}
                    </td>
                    <td>{order.employee_name}</td>
                    <td>{order.destination}, {order.country}</td>
                    <td>{order.duration_days}d {order.duration_hours % 24}h</td>
                    <td>{order.daily_allowance.toFixed(2)}</td>
                    <td>{order.travel_allowance.toFixed(2)}</td>
                    <td style={{ fontWeight: 'bold' }}>
                      {order.total_amount.toFixed(2)} EUR
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(order.id)}
                      >
                        Obriši
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Informacije o zakonskim odredbama */}
      <div className="card">
        <div className="card-header">Zakonske odredbe - Putni nalozi RH</div>
        <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
          <h4 style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Dnevnice 2025 (prema Pravilniku o porezu na dohodak):</h4>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li><strong>Hrvatska:</strong></li>
            <ul style={{ marginLeft: '1rem' }}>
              <li>8-12 sati: <strong>15,00 EUR</strong> (poludnevna dnevnica)</li>
              <li>12+ sati: <strong>30,00 EUR</strong> (punodnevna dnevnica)</li>
              <li>Umanjenje za obrok: <strong>30%</strong> za jedan obrok, <strong>60%</strong> za dva obroka</li>
            </ul>
            <li style={{ marginTop: '0.5rem' }}><strong>Inozemstvo (prosječno za EU):</strong></li>
            <ul style={{ marginLeft: '1rem' }}>
              <li>Kraće od 12h: <strong>35,00 EUR</strong> (50% pune dnevnice)</li>
              <li>12+ sati: <strong>70,00 EUR</strong> (punodnevna dnevnica)</li>
              <li>Umanjenje za obrok: <strong>30%</strong> za jedan obrok, <strong>60%</strong> za dva obroka</li>
            </ul>
          </ul>
          
          <h4 style={{ fontSize: '1rem' }}>Naknada za km (neoporeziva):</h4>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li><strong>0,50 EUR</strong> po kilometru (korištenje privatnog automobila)</li>
          </ul>
          
          <h4 style={{ fontSize: '1rem' }}>Napomene:</h4>
          <ul style={{ marginLeft: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
            <li>Smještaj se nadoknađuje prema stvarnim troškovima (uz račun)</li>
            <li>Za inozemstvo: dnevnice se definiraju po državama (ovdje prikazane prosječne za EU)</li>
            <li>Put kraći od 8 sati ne daje pravo na dnevnicu (RH)</li>
            <li>Sve iznose je potrebno dokumentirati službenim nalozom i računima</li>
          </ul>
          
          <h4 style={{ fontSize: '1rem' }}>Napomena:</h4>
          <p style={{ marginLeft: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
            Udaljenosti su automatski izračunate od Zagreba. Za točnije udaljenosti ili nedostajuće gradove, 
            kontaktirajte administratora.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TravelOrders;

