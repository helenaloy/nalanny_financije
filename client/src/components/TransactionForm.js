import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const TransactionForm = ({ transaction, categories, onClose }) => {
  const [formData, setFormData] = useState({
    date: transaction
      ? format(new Date(transaction.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    description: transaction?.description || '',
    amount: transaction?.amount || '',
    type: transaction?.type || 'prihod',
    category: transaction?.category || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.date || !formData.description || !formData.amount) {
      setError('Molimo ispunite sva obavezna polja');
      return;
    }

    try {
      setSaving(true);
      if (transaction) {
        await axios.put(`/api/transactions/${transaction.id}`, formData);
      } else {
        await axios.post('/api/transactions', formData);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Greška pri spremanju transakcije');
    } finally {
      setSaving(false);
    }
  };

  const getCategoriesByType = () => {
    return categories.filter((cat) => cat.type === formData.type);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">
          {transaction ? 'Uredi transakciju' : 'Nova transakcija'}
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Datum *</label>
            <input
              type="date"
              name="date"
              className="form-control"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Opis *</label>
            <input
              type="text"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Iznos *</label>
            <input
              type="number"
              name="amount"
              className="form-control"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Tip *</label>
            <select
              name="type"
              className="form-control"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="prihod">Prihod</option>
              <option value="rashod">Rashod</option>
            </select>
          </div>

          <div className="form-group">
            <label>Kategorija</label>
            <select
              name="category"
              className="form-control"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Automatska kategorizacija</option>
              {getCategoriesByType().map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Odustani
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Spremanje...' : transaction ? 'Ažuriraj' : 'Spremi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;

