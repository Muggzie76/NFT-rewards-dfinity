import React from 'react';
import { Principal } from '@dfinity/principal';
import { ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as WalletService } from '../../../declarations/wallet_rust/wallet_rust.did';
import type { _SERVICE as PayoutService } from '../../../declarations/payout/payout.did';
import './Staking.css';

interface StakingProps {
  walletActor: ActorSubclass<WalletService>;
  payoutActor: ActorSubclass<PayoutService>;
  userPrincipal: Principal;
}

const Staking = ({ walletActor, payoutActor, userPrincipal }: StakingProps) => {
  return (
    <div className="staking">
      <h1>Staking</h1>
      <div className="staking-content">
        <p>Your principal ID is: {userPrincipal.toString()}</p>
      </div>
    </div>
  );
};

export default Staking; 