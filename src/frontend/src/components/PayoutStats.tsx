import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { payout } from '../../../declarations/payout';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
    total_registered_users: bigint;
    last_payout_time: bigint;
    next_payout_time: bigint;
    total_payouts_processed: bigint;
    total_payout_amount: bigint;
    failed_transfers: bigint;
    is_processing: boolean;
}

interface UserStats {
    nft_count: bigint;
    last_payout_amount: bigint;
    last_payout_time: bigint;
    total_payouts_received: bigint;
}

const PayoutStats: React.FC = () => {
    const { identity } = useAuth();
    const [globalStats, setGlobalStats] = useState<Stats | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await payout.get_stats();
                setGlobalStats(stats);

                if (identity) {
                    const userStats = await payout.get_user_stats(identity.getPrincipal());
                    setUserStats(userStats);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [identity]);

    if (loading) {
        return <div>Loading stats...</div>;
    }

    const formatTime = (timestamp: bigint) => {
        const date = new Date(Number(timestamp) / 1_000_000); // Convert from nanoseconds
        return date.toLocaleString();
    };

    const formatICP = (amount: bigint) => {
        return (Number(amount) / 100_000_000).toFixed(8) + ' ICP';
    };

    return (
        <div className="payout-stats">
            <h2>Payout Statistics</h2>
            
            {globalStats && (
                <div className="global-stats">
                    <h3>Global Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <label>Total Registered Users:</label>
                            <span>{globalStats.total_registered_users.toString()}</span>
                        </div>
                        <div className="stat-item">
                            <label>Last Payout:</label>
                            <span>{formatTime(globalStats.last_payout_time)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Next Payout:</label>
                            <span>{formatTime(globalStats.next_payout_time)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Total Payouts Processed:</label>
                            <span>{globalStats.total_payouts_processed.toString()}</span>
                        </div>
                        <div className="stat-item">
                            <label>Total Payout Amount:</label>
                            <span>{formatICP(globalStats.total_payout_amount)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Failed Transfers:</label>
                            <span>{globalStats.failed_transfers.toString()}</span>
                        </div>
                        <div className="stat-item">
                            <label>Status:</label>
                            <span className={globalStats.is_processing ? 'processing' : 'idle'}>
                                {globalStats.is_processing ? 'Processing' : 'Idle'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {userStats && (
                <div className="user-stats">
                    <h3>Your Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <label>NFT Count:</label>
                            <span>{userStats.nft_count.toString()}</span>
                        </div>
                        <div className="stat-item">
                            <label>Last Payout Amount:</label>
                            <span>{formatICP(userStats.last_payout_amount)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Last Payout Time:</label>
                            <span>{formatTime(userStats.last_payout_time)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Total Payouts Received:</label>
                            <span>{userStats.total_payouts_received.toString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayoutStats; 