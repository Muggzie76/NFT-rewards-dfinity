import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as walletIdlFactory } from '../../../declarations/wallet_rust';
import { idlFactory as payoutIdlFactory } from '../../../declarations/payout';
import type { _SERVICE as WalletService } from '../../../declarations/wallet_rust/wallet_rust.did';
import type { _SERVICE as PayoutService } from '../../../declarations/payout/payout.did';

const isDevelopment = process.env.NODE_ENV !== 'production';
const host = isDevelopment ? 'http://localhost:4943' : 'https://ic0.app';

export const createWalletActor = async () => {
  const agent = new HttpAgent({ host });
  
  if (isDevelopment) {
    await agent.fetchRootKey();
  }
  
  return Actor.createActor<WalletService>(walletIdlFactory, {
    agent,
    canisterId: process.env.WALLET_CANISTER_ID || 'bd3sg-teaaa-aaaaa-qaaba-cai',
  });
};

export const createPayoutActor = async () => {
  const agent = new HttpAgent({ host });
  
  if (isDevelopment) {
    await agent.fetchRootKey();
  }
  
  return Actor.createActor<PayoutService>(payoutIdlFactory, {
    agent,
    canisterId: process.env.PAYOUT_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
  });
}; 