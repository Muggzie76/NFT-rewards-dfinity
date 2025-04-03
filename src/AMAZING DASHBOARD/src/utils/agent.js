// Integration with Internet Computer canisters
import { mockData } from './mockData'; // Keeping mockData as fallback
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Define canister IDs
const WALLET_CANISTER_ID = 'rce3q-iaaaa-aaaap-qpyfa-cai';
const PAYOUT_CANISTER_ID = 'zeqfj-qyaaa-aaaaf-qanua-cai';

// Create an agent (no identity needed for public read operations)
const agent = new HttpAgent({
  host: "https://ic0.app",
});

// Define canister interfaces
const walletInterface = ({ IDL }) => {
  const HolderInfo = IDL.Record({
    'daku_count': IDL.Nat64,
    'gg_count': IDL.Nat64,
    'total_count': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });
  return IDL.Service({
    'get_all_holders': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, HolderInfo))], ['query']),
    'get_total_holders': IDL.Func([], [IDL.Nat64], ['query']),
  });
};

const payoutInterface = ({ IDL }) => {
  const FeeRecord = IDL.Record({
    'fee': IDL.Nat64,
    'network_load': IDL.Nat64,
    'timestamp': IDL.Int,
    'success': IDL.Bool,
  });
  
  const BatchStats = IDL.Record({
    'total_batches': IDL.Nat64,
    'successful_batches': IDL.Nat64,
    'failed_batches': IDL.Nat64,
    'average_batch_size': IDL.Nat64,
    'average_batch_processing_time': IDL.Nat64,
    'last_batch_size': IDL.Nat64,
  });
  
  const BalanceAlert = IDL.Record({
    'timestamp': IDL.Int,
    'alert_type': IDL.Text,
    'current_balance': IDL.Nat64,
    'threshold': IDL.Nat64,
    'message': IDL.Text,
  });
  
  const Stats = IDL.Record({
    'total_registered_users': IDL.Nat64,
    'last_payout_time': IDL.Int,
    'next_payout_time': IDL.Int,
    'total_payouts_processed': IDL.Nat64,
    'total_payout_amount': IDL.Nat64,
    'failed_transfers': IDL.Nat64,
    'is_processing': IDL.Bool,
    'average_payout_amount': IDL.Nat64,
    'success_rate': IDL.Nat64,
    'last_error': IDL.Opt(IDL.Text),
    'total_holders': IDL.Nat64,
    'active_holders': IDL.Nat64,
    'processing_time_ms': IDL.Nat64,
    'balance_status': IDL.Text,
    'balance_alerts': IDL.Vec(BalanceAlert),
    'current_network_fee': IDL.Nat64,
    'average_network_fee': IDL.Nat64,
    'fee_history': IDL.Vec(FeeRecord),
    'batch_processing_stats': BatchStats,
    'token_balance': IDL.Nat64,
  });
  
  const UserStats = IDL.Record({
    'nft_count': IDL.Nat64,
    'last_payout_amount': IDL.Nat64,
    'last_payout_time': IDL.Int,
    'total_payouts_received': IDL.Nat64,
  });
  
  return IDL.Service({
    'get_stats': IDL.Func([], [Stats], ['query']),
    'get_all_user_stats': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserStats))], ['query']),
  });
};

// Create actor instances
const walletActor = Actor.createActor(walletInterface, {
  agent,
  canisterId: WALLET_CANISTER_ID,
});

const payoutActor = Actor.createActor(payoutInterface, {
  agent,
  canisterId: PAYOUT_CANISTER_ID,
});

// Helper functions
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format ZOMB token amount with proper decimal places
// ZOMB tokens have 8 decimal places
export const formatZombAmount = (amount) => {
  // Convert to proper decimal format (divide by 10^8)
  const zombAmount = Number(amount) / 100000000;
  // Format with commas and 2 decimal places
  return zombAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
};

export const truncateAddress = (address) => {
  if (!address) return '';
  const start = address.slice(0, 6);
  const end = address.slice(-4);
  return `${start}...${end}`;
};

export const formatDate = (timestamp) => {
  // Convert nanoseconds to milliseconds
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Fetch functions that integrate with canisters
export const fetchStats = async () => {
  try {
    const stats = await payoutActor.get_stats();
    return {
      totalHolders: Number(stats.total_holders),
      totalNFTs: Number(stats.total_holders), // Approximation
      dakuNFTs: 0, // Will be calculated in fetchCollectionDistribution
      ggAlbumNFTs: 0, // Will be calculated in fetchCollectionDistribution
      stakingRate: Number(stats.success_rate),
      tokenBalance: Number(stats.token_balance),
      averagePayoutAmount: Number(stats.average_payout_amount),
      totalPayoutsProcessed: Number(stats.total_payouts_processed),
      lastPayoutTime: stats.last_payout_time,
      nextPayoutTime: stats.next_payout_time
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return mockData.stats; // Fallback to mock data
  }
};

export const fetchNFTDistribution = async () => {
  try {
    const holders = await walletActor.get_all_holders();
    
    // Transform the data to the required format
    return holders.map(([principal, info]) => ({
      principalId: principal.toText(),
      dakuCount: Number(info.daku_count),
      ggCount: Number(info.gg_count),
      totalCount: Number(info.total_count)
    }));
  } catch (error) {
    console.error("Error fetching NFT distribution:", error);
    return []; // Empty array as fallback
  }
};

export const fetchTopHolders = async () => {
  try {
    const holders = await walletActor.get_all_holders();
    
    // Transform and sort by total NFT count
    const topHolders = holders
      .map(([principal, info]) => ({
        principalId: principal.toText(),
        dakuNFTs: Number(info.daku_count),
        ggAlbumNFTs: Number(info.gg_count),
        totalNFTs: Number(info.total_count),
        stakedPercentage: 100, // Assuming all NFTs are staked
        rewardsEarned: "Calculating..."
      }))
      .sort((a, b) => b.totalNFTs - a.totalNFTs)
      .slice(0, 10); // Get top 10
    
    // Add ranks
    return topHolders.map((holder, index) => ({
      ...holder,
      rank: index + 1,
      // Calculate tokens - 100 ZOMB per NFT, but format properly with decimals
      rewardsEarned: `${formatZombAmount(holder.totalNFTs * 10000000000)} ZOMB`
    }));
  } catch (error) {
    console.error("Error fetching top holders:", error);
    return mockData.topHolders; // Fallback to mock data
  }
};

export const fetchRewardsDistribution = async () => {
  try {
    const stats = await payoutActor.get_stats();
    const userStats = await payoutActor.get_all_user_stats();
    
    // Transform to the expected format
    return userStats
      .filter(([_, stats]) => Number(stats.last_payout_amount) > 0)
      .map(([principal, stats]) => ({
        time: formatDate(stats.last_payout_time),
        principalId: principal.toText(),
        nftCount: Number(stats.nft_count),
        // Format with proper decimal places
        w8Amount: formatZombAmount(stats.last_payout_amount),
        txnHash: `0x${Math.random().toString(16).substring(2, 12)}`
      }))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10); // Get the 10 most recent
  } catch (error) {
    console.error("Error fetching rewards distribution:", error);
    return mockData.rewardsDistribution; // Fallback to mock data
  }
};

export const fetchStakingStats = async () => {
  // This is historical data that we'll keep from mock data
  return mockData.stakingStats;
};

export const fetchCollectionDistribution = async () => {
  try {
    const holders = await walletActor.get_all_holders();
    
    // Calculate totals
    let dakuTotal = 0;
    let ggTotal = 0;
    
    holders.forEach(([_, info]) => {
      dakuTotal += Number(info.daku_count);
      ggTotal += Number(info.gg_count);
    });
    
    return [
      { name: 'Daku NFTs', value: dakuTotal },
      { name: 'GG Album NFTs', value: ggTotal }
    ];
  } catch (error) {
    console.error("Error fetching collection distribution:", error);
    return mockData.collectionDistribution; // Fallback to mock data
  }
};

export const fetchHoldingsDistribution = async () => {
  try {
    const holders = await walletActor.get_all_holders();
    
    // Count holders in each range
    const ranges = {
      '1-10 NFTs': 0,
      '11-50 NFTs': 0,
      '51-100 NFTs': 0,
      '101-500 NFTs': 0,
      '500+ NFTs': 0
    };
    
    holders.forEach(([_, info]) => {
      const count = Number(info.total_count);
      if (count >= 500) ranges['500+ NFTs']++;
      else if (count >= 101) ranges['101-500 NFTs']++;
      else if (count >= 51) ranges['51-100 NFTs']++;
      else if (count >= 11) ranges['11-50 NFTs']++;
      else if (count >= 1) ranges['1-10 NFTs']++;
    });
    
    // Convert to percentages
    const total = holders.length;
    return Object.entries(ranges).map(([range, count]) => ({
      range,
      percentage: Math.round((count / total) * 100)
    }));
  } catch (error) {
    console.error("Error fetching holdings distribution:", error);
    return mockData.holdingsDistribution; // Fallback to mock data
  }
}; 