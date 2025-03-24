import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
    const { principal, login, logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">NFT Staking</Link>
            </div>
            <div className="navbar-links">
                <Link 
                    to="/" 
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                >
                    Dashboard
                </Link>
                <Link 
                    to="/staking" 
                    className={`nav-link ${isActive('/staking') ? 'active' : ''}`}
                >
                    Staking
                </Link>
                <Link 
                    to="/profile" 
                    className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                >
                    Profile
                </Link>
                <Link 
                    to="/stats" 
                    className={`nav-link ${isActive('/stats') ? 'active' : ''}`}
                >
                    Stats
                </Link>
            </div>
            <div className="navbar-auth">
                {principal ? (
                    <div className="auth-info">
                        <span className="principal-id">
                            {principal.toString().slice(0, 8)}...{principal.toString().slice(-8)}
                        </span>
                        <button onClick={logout} className="auth-button">
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button onClick={login} className="auth-button">
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar; 