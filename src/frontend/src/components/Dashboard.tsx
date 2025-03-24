import React from 'react';
import { Principal } from '@dfinity/principal';
import { ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as WalletService } from '../../../declarations/wallet_rust/wallet_rust.did';
import type { _SERVICE as PayoutService } from '../../../declarations/payout/payout.did';
import './Dashboard.css';

interface DashboardProps {
  walletActor: ActorSubclass<WalletService>;
  payoutActor: ActorSubclass<PayoutService>;
  userPrincipal: Principal;
}

const Dashboard = ({ walletActor, payoutActor, userPrincipal }: DashboardProps) => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="dashboard-content">
        <p>Welcome! Your principal ID is: {userPrincipal.toString()}</p>
      </div>
    </div>
  );
};

export default Dashboard; 