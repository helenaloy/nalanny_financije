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
  const [showDeleteYearModal, setShowDeleteYearModal] = useState(false);
  const [deleteYear, setDeleteYear] = useState(new Date().getFullYear());
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteByYear = async () => {
    if (!deleteYear || deleteYear < 2000 || deleteYear > 2100) {
      alert('Molimo unesite valjanu godinu');
      return;
    }

    const confirmMessage = `Jeste li SIGURNI da želite obrisati SVE transakcije iz ${deleteYear}. godine?\n\nOvo će trajno obrisati sve transakcije i ne može se poništiti!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setDeleting(true);
        const response = await axios.delete(`/api/transactions/year/${deleteYear}`);
        alert(response.data.message || `Uspješno obrisano ${response.data.deletedCount} transakcija iz ${deleteYear}. godine`);
        setShowDeleteYearModal(false);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transactions:', error);
        alert(error.response?.data?.error || 'Greška pri brisanju transakcija');
      } finally {
        setDeleting(false);
      }
    }
  };

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Transakcije</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-danger" 
            onClick={() => setShowDeleteYearModal(true)}
            style={{ fontSize: '0.875rem' }}
          >
            Obriši po godini
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Dodaj transakciju
          </button>
        </div>
      </div>

      {/* Filteri */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>Filtriraj transakcije</div>
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
                  <td style={{ whiteSpace: 'nowrap' }}>{format(new Date(transaction.date), 'dd.MM.yyyy')}</td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{transaction.description}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                      {transaction.amount.toLocaleString('hr-HR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      EUR
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
                  <td style={{ whiteSpace: 'nowrap' }}>{transaction.category || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: '0.5rem', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                      onClick={() => handleEdit(transaction)}
                    >
                      Uredi
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
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

      {/* Modal za brisanje po godini */}
      {showDeleteYearModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteYearModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Obriši sve transakcije po godini</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowDeleteYearModal(false)}
                disabled={deleting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                <strong>Upozorenje:</strong> Ova akcija će trajno obrisati sve transakcije iz odabrane godine i ne može se poništiti!
              </div>
              <div className="form-group">
                <label>Odaberite godinu:</label>
                <select
                  className="form-control"
                  value={deleteYear}
                  onChange={(e) => setDeleteYear(parseInt(e.target.value))}
                  disabled={deleting}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteYearModal(false)}
                disabled={deleting}
              >
                Odustani
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteByYear}
                disabled={deleting}
              >
                {deleting ? 'Brisanje...' : `Obriši sve iz ${deleteYear}. godine`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

