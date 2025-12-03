import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [summary, setSummary] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchSummary();
    fetchYearlySummary();
  }, [selectedYear]);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`/api/reports/summary?year=${selectedYear}`);
      setSummary(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setLoading(false);
    }
  };

  const fetchYearlySummary = async () => {
    try {
      const response = await axios.get('/api/reports/yearly');
      setYearlySummary(response.data);
    } catch (error) {
      console.error('Error fetching yearly summary:', error);
    }
  };

  // Izračunaj ukupne prihode i rashode za odabranu godinu
  const currentYearData = yearlySummary.find(y => y.year === selectedYear);
  const totalPrihodi = currentYearData?.totalPrihodi || 0;
  const totalRashodi = currentYearData?.totalRashodi || 0;
  const saldo = totalPrihodi - totalRashodi;

  // Pripremi podatke za grafikon
  const chartData = {
    labels: summary.map(s => {
      const [year, month] = s.month.split('-');
      const date = new Date(year, month - 1);
      return format(date, 'MMMM yyyy');
    }).reverse(),
    datasets: [
      {
        label: 'Prihodi',
        data: summary.map(s => s.totalPrihodi).reverse(),
        backgroundColor: 'rgba(39, 174, 96, 0.6)',
        borderColor: 'rgba(39, 174, 96, 1)',
        borderWidth: 1,
      },
      {
        label: 'Rashodi',
        data: summary.map(s => s.totalRashodi).reverse(),
        backgroundColor: 'rgba(231, 76, 60, 0.6)',
        borderColor: 'rgba(231, 76, 60, 1)',
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
      title: {
        display: true,
        text: 'Pregled prihoda i rashoda po mjesecima',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }

  return (
    <div>
      <h1>Pregled financija</h1>

      {/* Statistike */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">Ukupni prihodi ({selectedYear})</div>
          <div className="stat-card-value positive">
            {totalPrihodi.toLocaleString('hr-HR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            EUR
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Ukupni rashodi ({selectedYear})</div>
          <div className="stat-card-value negative">
            {totalRashodi.toLocaleString('hr-HR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            EUR
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Saldo ({selectedYear})</div>
          <div
            className={`stat-card-value ${saldo >= 0 ? 'positive' : 'negative'}`}
          >
            {saldo.toLocaleString('hr-HR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            EUR
          </div>
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

      {/* Grafikon */}
      {summary.length > 0 && (
        <div className="card">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Tablica po mjesecima */}
      <div className="card">
        <div className="card-header">Detaljni pregled po mjesecima</div>
        <table className="table">
          <thead>
            <tr>
              <th>Mjesec</th>
              <th>Prihodi</th>
              <th>Rashodi</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {summary
              .slice()
              .reverse()
              .map((month) => (
                <tr key={month.month}>
                  <td>
                    {format(new Date(month.month + '-01'), 'MMMM yyyy')}
                  </td>
                  <td className="stat-card-value positive">
                    {month.totalPrihodi.toLocaleString('hr-HR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    EUR
                  </td>
                  <td className="stat-card-value negative">
                    {month.totalRashodi.toLocaleString('hr-HR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    EUR
                  </td>
                  <td
                    className={`stat-card-value ${
                      month.saldo >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    {month.saldo.toLocaleString('hr-HR', {
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
  );
};

export default Dashboard;

