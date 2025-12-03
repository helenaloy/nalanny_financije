import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">Nalanny Financije</div>
        <div className="navbar-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Pregled
          </Link>
          <Link
            to="/transactions"
            className={location.pathname === '/transactions' ? 'active' : ''}
          >
            Transakcije
          </Link>
          <Link
            to="/upload"
            className={location.pathname === '/upload' ? 'active' : ''}
          >
            Uvoz PDF
          </Link>
          <Link
            to="/travel-orders"
            className={location.pathname === '/travel-orders' ? 'active' : ''}
          >
            Putni nalozi
          </Link>
          <Link
            to="/reports"
            className={location.pathname === '/reports' ? 'active' : ''}
          >
            Izvještaji
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

