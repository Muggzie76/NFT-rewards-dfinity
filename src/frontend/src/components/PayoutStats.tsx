import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { ActorSubclass } from '@dfinity/agent';
import type { _SERVICE } from 'declarations/payout/payout.did';

interface PayoutStatsProps {
  payoutActor: ActorSubclass<_SERVICE>;
  userPrincipal: Principal;
}

interface Stats {
  totalStaked: bigint;
  totalRewards: bigint;
  userStaked: bigint;
  userRewards: bigint;
}

const PayoutStats: React.FC<PayoutStatsProps> = ({ payoutActor, userPrincipal }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [globalStats, userStats] = await Promise.all([
          payoutActor.get_stats(),
          payoutActor.get_user_stats(userPrincipal)
        ]);

        setStats({
          totalStaked: globalStats.total_registered_users,
          totalRewards: globalStats.total_payout_amount,
          userStaked: userStats.nft_count,
          userRewards: userStats.total_payouts_received
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [payoutActor, userPrincipal]);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No stats available</div>;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Staked</h3>
        <p>{Number(stats.totalStaked).toLocaleString()} ICP</p>
      </div>
      <div className="stat-card">
        <h3>Total Rewards</h3>
        <p>{Number(stats.totalRewards).toLocaleString()} ICP</p>
      </div>
      <div className="stat-card">
        <h3>Your Staked</h3>
        <p>{Number(stats.userStaked).toLocaleString()} ICP</p>
      </div>
      <div className="stat-card">
        <h3>Your Rewards</h3>
        <p>{Number(stats.userRewards).toLocaleString()} ICP</p>
      </div>
    </div>
  );
};

export default PayoutStats; 