import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const routes = [
    { path: '/', label: 'Dashboard' },
    { path: '/staking', label: 'Staking' },
    { path: '/profile', label: 'Profile' }
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">NFT Staking DApp</Link>
      </div>
      <div className="nav-links">
        {routes.map(route => (
          <Link
            key={route.path}
            to={route.path}
            className={location.pathname === route.path ? 'active' : ''}
          >
            {route.label}
          </Link>
        ))}
      </div>
      <button onClick={logout} className="logout-button">
        Logout
      </button>
    </nav>
  );
};

export default Navigation; 