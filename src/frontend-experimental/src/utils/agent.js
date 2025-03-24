import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

const PAYOUT_CANISTER_ID = process.env.REACT_APP_PAYOUT_CANISTER_ID || "zeqfj-qyaaa-aaaaf-qanua-cai";
const WALLET_CANISTER_ID = process.env.REACT_APP_WALLET_CANISTER_ID || "rce3q-iaaaa-aaaap-qpyfa-cai";
const IC_HOST = process.env.REACT_APP_IC_HOST || "https://ic0.app";
const API_REQUEST_TIMEOUT = parseInt(process.env.REACT_APP_API_REQUEST_TIMEOUT) || 30000;

// Create an agent for IC mainnet with request throttling
const createAgent = () => {
  const agent = new HttpAgent({
    host: IC_HOST,
    fetchOptions: {
      timeout: API_REQUEST_TIMEOUT,
    }
  });

  // Add simple request throttling
  let lastRequestTime = 0;
  const minRequestInterval = 100; // 100ms between requests

  const originalTransform = agent.transform;
  agent.transform = async (request) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, minRequestInterval - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
    return originalTransform ? originalTransform(request) : request;
  };

  return agent;
};

const agent = createAgent();

// Error handling wrapper
const withErrorHandling = (fn) => async (...args) => {
  try {
    const result = await fn(...args);
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.message || 'An error occurred while processing your request');
  }
};

// Payout canister interface
const payoutInterface = ({ IDL }) => {
  const UserStats = IDL.Record({
    'last_payout_time': IDL.Int,
    'nft_count': IDL.Nat64,
    'last_payout_amount': IDL.Nat64,
    'total_payouts_received': IDL.Nat64,
  });
  const Stats = IDL.Record({
    'last_payout_time': IDL.Int,
    'total_payouts_processed': IDL.Nat64,
    'total_payout_amount': IDL.Nat64,
    'total_registered_users': IDL.Nat64,
    'next_payout_time': IDL.Int,
    'is_processing': IDL.Bool,
    'failed_transfers': IDL.Nat64,
  });
  return IDL.Service({
    'get_all_user_stats': IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Principal, UserStats))],
      ['query'],
    ),
    'get_stats': IDL.Func([], [Stats], ['query']),
    'get_user_stats': IDL.Func([IDL.Principal], [UserStats], ['query']),
    'processPayouts': IDL.Func([], [], []),
    'register': IDL.Func([], [], []),
  });
};

// Wallet canister interface
const walletInterface = ({ IDL }) => {
  return IDL.Service({
    'getNFTCount': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getBalance': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
  });
};

// Create actors with error handling
export const createPayoutActor = () => {
  const actor = Actor.createActor(payoutInterface, {
    agent,
    canisterId: PAYOUT_CANISTER_ID,
  });

  return {
    get_all_user_stats: withErrorHandling(actor.get_all_user_stats.bind(actor)),
    get_stats: withErrorHandling(actor.get_stats.bind(actor)),
    get_user_stats: withErrorHandling(actor.get_user_stats.bind(actor)),
    processPayouts: withErrorHandling(actor.processPayouts.bind(actor)),
    register: withErrorHandling(actor.register.bind(actor)),
  };
};

export const createWalletActor = () => {
  const actor = Actor.createActor(walletInterface, {
    agent,
    canisterId: WALLET_CANISTER_ID,
  });

  return {
    getNFTCount: withErrorHandling(actor.getNFTCount.bind(actor)),
    getBalance: withErrorHandling(actor.getBalance.bind(actor)),
  };
};

// Data formatting utilities
export const formatStats = (rawStats) => ({
  totalStaked: Number(rawStats.total_registered_users),
  totalRewards: Number(rawStats.total_payout_amount) / 100000000, // Convert e8s to ICP
  lastPayoutTime: Number(rawStats.last_payout_time),
  nextPayoutTime: Number(rawStats.next_payout_time),
  totalPayoutsProcessed: Number(rawStats.total_payouts_processed),
  failedTransfers: Number(rawStats.failed_transfers),
  isProcessing: rawStats.is_processing
});

export const formatUserStats = (rawStats) => ({
  nftCount: Number(rawStats.nft_count),
  lastPayoutAmount: Number(rawStats.last_payout_amount) / 100000000, // Convert e8s to ICP
  lastPayoutTime: Number(rawStats.last_payout_time),
  totalPayoutsReceived: Number(rawStats.total_payouts_received) / 100000000 // Convert e8s to ICP
}); 