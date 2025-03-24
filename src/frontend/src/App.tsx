import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type { _SERVICE as WalletService } from 'declarations/wallet_rust/wallet_rust.did';
import type { _SERVICE as PayoutService } from 'declarations/payout/payout.did';
import { idlFactory as walletIdlFactory } from 'declarations/wallet_rust';
import { idlFactory as payoutIdlFactory } from 'declarations/payout';
import Navigation from '@/components/Navigation';
import Dashboard from './components/Dashboard';
import Staking from './components/Staking';
import Profile from './components/Profile';
import PlugConnect from './components/PlugConnect';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [walletActor, setWalletActor] = useState<ActorSubclass<WalletService> | null>(null);
  const [payoutActor, setPayoutActor] = useState<ActorSubclass<PayoutService> | null>(null);

  const handlePlugConnect = async (plugPrincipal: string) => {
    const principalObj = Principal.fromText(plugPrincipal);
    setPrincipal(principalObj);
    setIsAuthenticated(true);
    
    try {
      const walletActor = await window.ic.plug.createActor({
        canisterId: 'rce3q-iaaaa-aaaap-qpyfa-cai',
        interfaceFactory: walletIdlFactory,
      }) as ActorSubclass<WalletService>;
      
      const payoutActor = await window.ic.plug.createActor({
        canisterId: 'zeqfj-qyaaa-aaaaf-qanua-cai',
        interfaceFactory: payoutIdlFactory,
      }) as ActorSubclass<PayoutService>;

      setWalletActor(walletActor);
      setPayoutActor(payoutActor);
    } catch (e) {
      console.error('Error creating actors:', e);
    }
  };

  const handlePlugDisconnect = () => {
    setPrincipal(null);
    setIsAuthenticated(false);
    setWalletActor(null);
    setPayoutActor(null);
  };

  const renderAuthenticatedRoutes = () => {
    if (!principal || !walletActor || !payoutActor) return null;

    return (
      <Routes>
        <Route 
          path="/" 
          element={
            <Dashboard 
              walletActor={walletActor}
              payoutActor={payoutActor}
              userPrincipal={principal}
            />
          } 
        />
        <Route 
          path="/staking" 
          element={
            <Staking 
              walletActor={walletActor}
              payoutActor={payoutActor}
              userPrincipal={principal}
            />
          } 
        />
        <Route 
          path="/profile" 
          element={
            <Profile 
              walletActor={walletActor}
              payoutActor={payoutActor}
              userPrincipal={principal}
            />
          } 
        />
      </Routes>
    );
  };

  return (
    <Router>
      <div className="app">
        <div className="auth-container">
          {!isAuthenticated ? (
            <>
              <button className="login-button internet-identity">
                Connect with Internet Identity
              </button>
              <PlugConnect 
                onConnect={handlePlugConnect}
                onDisconnect={handlePlugDisconnect}
              />
            </>
          ) : null}
        </div>
        <Navigation />
        <div className="app-content">
          {!isAuthenticated ? (
            <div className="login-container">
              <h1>NFT Staking DApp</h1>
            </div>
          ) : (
            renderAuthenticatedRoutes()
          )}
        </div>
      </div>
    </Router>
  );
};

export default App; 