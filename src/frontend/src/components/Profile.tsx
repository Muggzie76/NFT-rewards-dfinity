import React from 'react';
import { Principal } from '@dfinity/principal';
import { ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as WalletService } from '../../../declarations/wallet_rust/wallet_rust.did';
import type { _SERVICE as PayoutService } from '../../../declarations/payout/payout.did';
import './Profile.css';

interface ProfileProps {
  walletActor: ActorSubclass<WalletService>;
  payoutActor: ActorSubclass<PayoutService>;
  userPrincipal: Principal;
}

const Profile = ({ walletActor, payoutActor, userPrincipal }: ProfileProps) => {
  return (
    <div className="profile">
      <h1>Profile</h1>
      <div className="profile-content">
        <p>Your principal ID is: {userPrincipal.toString()}</p>
      </div>
    </div>
  );
};

export default Profile; 