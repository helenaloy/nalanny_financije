import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import TransactionForm from '../components/TransactionForm';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    category: '',
    search: '',
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/transactions?${params.toString()}`);
      setTransactions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/transactions/categories/list');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Jeste li sigurni da želite obrisati ovu transakciju?')) {
      try {
        await axios.delete(`/api/transactions/${id}`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Greška pri brisanju transakcije');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      category: '',
      search: '',
    });
  };

  const getCategoriesByType = (type) => {
    return categories.filter((cat) => !type || cat.type === type);
  };

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Transakcije</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Dodaj transakciju
        </button>
      </div>

      {/* Filteri */}
      <div className="card">
        <div className="card-header">Filtriraj transakcije</div>
        <div className="filter-bar">
          <div className="filter-group">
            <label>Početni datum:</label>
            <input
              type="date"
              name="startDate"
              className="form-control"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Završni datum:</label>
            <input
              type="date"
              name="endDate"
              className="form-control"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Tip:</label>
            <select
              name="type"
              className="form-control"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">Svi</option>
              <option value="prihod">Prihodi</option>
              <option value="rashod">Rashodi</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Kategorija:</label>
            <select
              name="category"
              className="form-control"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">Sve</option>
              {getCategoriesByType(filters.type).map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Pretraži:</label>
            <input
              type="text"
              name="search"
              className="form-control"
              placeholder="Pretraži po opisu..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <button className="btn btn-secondary" onClick={clearFilters}>
              Obriši filtere
            </button>
          </div>
        </div>
      </div>

      {/* Tablica transakcija */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Opis</th>
              <th>Iznos</th>
              <th>Tip</th>
              <th>Kategorija</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  Nema transakcija
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{format(new Date(transaction.date), 'dd.MM.yyyy')}</td>
                  <td>{transaction.description}</td>
                  <td>
                    {transaction.amount.toLocaleString('hr-HR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    HRK
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        transaction.type === 'prihod' ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {transaction.type === 'prihod' ? 'Prihod' : 'Rashod'}
                    </span>
                  </td>
                  <td>{transaction.category || '-'}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => handleEdit(transaction)}
                    >
                      Uredi
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => handleDelete(transaction.id)}
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

      {/* Forma za dodavanje/uređivanje */}
      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          categories={categories}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default Transactions;

