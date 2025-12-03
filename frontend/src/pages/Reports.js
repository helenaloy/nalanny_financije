import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [yearlySummary, setYearlySummary] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchYearlySummary();
    fetchMonthlySummary();
  }, [selectedYear]);

  const fetchYearlySummary = async () => {
    try {
      const response = await axios.get('/api/reports/yearly');
      setYearlySummary(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching yearly summary:', error);
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const response = await axios.get(`/api/reports/summary?year=${selectedYear}`);
      setMonthlySummary(response.data);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    }
  };

  const handleExport = async (format = 'excel') => {
    try {
      setExportLoading(true);
      const response = await axios.get(`/api/reports/export?format=${format}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transakcije-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Greška pri izvozu podataka');
    } finally {
      setExportLoading(false);
    }
  };

  // Pripremi podatke za grafikon kategorija rashoda
  const currentYearData = yearlySummary.find((y) => y.year === selectedYear);
  const expenseCategories = currentYearData
    ? Object.entries(currentYearData.rashodi).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const expenseChartData = {
    labels: expenseCategories.map((c) => c.name),
    datasets: [
      {
        label: 'Rashodi po kategorijama',
        data: expenseCategories.map((c) => c.value),
        backgroundColor: [
          'rgba(231, 76, 60, 0.6)',
          'rgba(230, 126, 34, 0.6)',
          'rgba(241, 196, 15, 0.6)',
          'rgba(46, 204, 113, 0.6)',
          'rgba(52, 152, 219, 0.6)',
          'rgba(155, 89, 182, 0.6)',
          'rgba(236, 240, 241, 0.6)',
        ],
        borderColor: [
          'rgba(231, 76, 60, 1)',
          'rgba(230, 126, 34, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
          'rgba(236, 240, 241, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const incomeCategories = currentYearData
    ? Object.entries(currentYearData.prihodi).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const incomeChartData = {
    labels: incomeCategories.map((c) => c.name),
    datasets: [
      {
        label: 'Prihodi po kategorijama',
        data: incomeCategories.map((c) => c.value),
        backgroundColor: [
          'rgba(39, 174, 96, 0.6)',
          'rgba(46, 204, 113, 0.6)',
          'rgba(52, 152, 219, 0.6)',
          'rgba(155, 89, 182, 0.6)',
        ],
        borderColor: [
          'rgba(39, 174, 96, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Izvještaji</h1>
        <div>
          <button
            className="btn btn-success"
            onClick={() => handleExport('excel')}
            disabled={exportLoading}
            style={{ marginRight: '0.5rem' }}
          >
            {exportLoading ? 'Izvoz...' : 'Izvezi u Excel'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            {exportLoading ? 'Izvoz...' : 'Izvezi u CSV'}
          </button>
        </div>
      </div>

      {/* Filter za godinu */}
      <div className="card">
        <div className="form-group">
          <label>Odaberi godinu:</label>
          <select
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            {yearlySummary.map((y) => (
              <option key={y.year} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Godišnji pregled */}
      <div className="card">
        <div className="card-header">Godišnji pregled</div>
        <table className="table">
          <thead>
            <tr>
              <th>Godina</th>
              <th>Ukupni prihodi</th>
              <th>Ukupni rashodi</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {yearlySummary.map((year) => (
              <tr key={year.year}>
                <td>{year.year}</td>
                <td className="stat-card-value positive">
                  {year.totalPrihodi.toLocaleString('hr-HR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  EUR
                </td>
                <td className="stat-card-value negative">
                  {year.totalRashodi.toLocaleString('hr-HR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  EUR
                </td>
                <td
                  className={`stat-card-value ${
                    year.saldo >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {year.saldo.toLocaleString('hr-HR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  EUR
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grafikon kategorija rashoda */}
      {expenseCategories.length > 0 && (
        <div className="card">
          <Pie data={expenseChartData} options={chartOptions} />
        </div>
      )}

      {/* Grafikon kategorija prihoda */}
      {incomeCategories.length > 0 && (
        <div className="card">
          <Pie data={incomeChartData} options={chartOptions} />
        </div>
      )}

      {/* Detaljni pregled kategorija za odabranu godinu */}
      {currentYearData && (
        <div className="card">
          <div className="card-header">Detaljni pregled kategorija za {selectedYear}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#27ae60' }}>Prihodi</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kategorija</th>
                    <th>Iznos</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentYearData.prihodi).map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        {value.toLocaleString('hr-HR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        EUR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#e74c3c' }}>Rashodi</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kategorija</th>
                    <th>Iznos</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentYearData.rashodi).map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        {value.toLocaleString('hr-HR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        EUR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

