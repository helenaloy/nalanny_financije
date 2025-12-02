import React, { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setResult(null);
    setPreviewTransactions(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Molimo odaberite PDF datoteku');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      setUploading(true);
      setError(null);
      setResult(null);
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Postavi transakcije za pregled
      setPreviewTransactions({
        transactions: response.data.transactions,
        filename: response.data.filename
      });
      setFile(null);
      // Reset file input
      document.getElementById('pdf-file').value = '';
    } catch (err) {
      setError(
        err.response?.data?.error || 'Greška pri uploadanju datoteke'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTypeChange = (index, newType) => {
    const updated = [...previewTransactions.transactions];
    updated[index].type = newType;
    setPreviewTransactions({
      ...previewTransactions,
      transactions: updated
    });
  };

  const handleConfirm = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await axios.post('/api/upload/confirm', {
        transactions: previewTransactions.transactions,
        filename: previewTransactions.filename
      });

      setResult(response.data);
      setPreviewTransactions(null);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Greška pri spremanju transakcija'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPreviewTransactions(null);
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <h1>Uvoz bankovnog izvoda</h1>

      {!previewTransactions && (
        <div className="card">
          <div className="card-header">Upload PDF bankovnog izvoda</div>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>Odaberi PDF datoteku:</label>
              <input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="form-control"
                style={{ padding: '0.5rem' }}
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
              <div className="alert alert-success">
                <p>
                  <strong>Uspješno!</strong> Spremljeno je {result.transactionsCount}{' '}
                  transakcija.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !file}
            >
              {uploading ? 'Uploadanje...' : 'Uploadaj i obradi'}
            </button>
          </form>
        </div>
      )}

      {previewTransactions && (
        <div className="card">
          <div className="card-header">
            Pregled transakcija - Provjerite i potvrdite prije spremanja
          </div>
          <div className="alert alert-info">
            <strong>Važno:</strong> Provjerite je li tip transakcije (prihod/rashod) točan
            prije spremanja. Možete promijeniti tip klikom na padajući izbornik.
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Opis</th>
                  <th>Iznos</th>
                  <th>Tip</th>
                  <th>Kategorija</th>
                </tr>
              </thead>
              <tbody>
                {previewTransactions.transactions.map((transaction, index) => (
                  <tr key={transaction.tempId || index}>
                    <td>{format(new Date(transaction.date), 'dd.MM.yyyy')}</td>
                    <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                      {transaction.description}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {transaction.amount.toLocaleString('hr-HR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      HRK
                      {transaction.originalAmountStr && (
                        <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem', display: 'block' }}>
                          (iz PDF: {transaction.originalAmountStr})
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={transaction.type}
                        onChange={(e) => handleTypeChange(index, e.target.value)}
                        className="form-control"
                        style={{
                          minWidth: '120px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="prihod">Prihod</option>
                        <option value="rashod">Rashod</option>
                      </select>
                    </td>
                    <td>{transaction.category || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Odustani
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? 'Spremanje...' : `Potvrdi i spremi ${previewTransactions.transactions.length} transakcija`}
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
        </div>
      )}

      <div className="card">
        <div className="card-header">Upute</div>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li>Uploadajte PDF datoteku bankovnog izvoda</li>
          <li>
            Aplikacija će automatski prepoznati transakcije i kategorizirati ih
          </li>
          <li>
            <strong>Provjerite tip transakcije</strong> - aplikacija će vas pitati
            prije spremanja je li tip točan
          </li>
          <li>
            Možete promijeniti tip transakcije prije potvrde i spremanja
          </li>
          <li>
            <strong>Napomena:</strong> Format PDF-a mora biti kompatibilan s
            parserom. Ako transakcije nisu pravilno prepoznate, možete ih
            ručno dodati ili urediti.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;

