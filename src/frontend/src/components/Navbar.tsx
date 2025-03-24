import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
    const { identity, login, logout } = useAuth();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">NFT Staking</Link>
            </div>
            <div className="navbar-links">
                <Link to="/stats">Payout Stats</Link>
                {identity ? (
                    <button onClick={logout} className="btn-logout">
                        Logout
                    </button>
                ) : (
                    <button onClick={login} className="btn-login">
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar; 