import React, { useState } from 'react';
import axios from 'axios';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setResult(null);
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
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
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

  return (
    <div>
      <h1>Uvoz bankovnog izvoda</h1>

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
                <strong>Uspješno!</strong> Obrađeno je {result.transactionsCount}{' '}
                transakcija.
              </p>
              {result.transactions && result.transactions.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p>
                    <strong>Primjer transakcija:</strong>
                  </p>
                  <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                    {result.transactions.slice(0, 5).map((t, idx) => (
                      <li key={idx}>
                        {t.date} - {t.description} -{' '}
                        {t.amount.toLocaleString('hr-HR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        HRK ({t.type}) - {t.category}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

      <div className="card">
        <div className="card-header">Upute</div>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li>Uploadajte PDF datoteku bankovnog izvoda</li>
          <li>
            Aplikacija će automatski prepoznati transakcije i kategorizirati ih
          </li>
          <li>
            Transakcije će biti automatski spremljene u bazu podataka
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

