// Mock data provider based on the CSV data
import { Principal } from "@dfinity/principal";

// Constants for calculation
const NFT_VALUE = 1000;
const APY_PERCENT = 10;
const PAYOUTS_PER_YEAR = 73;

// Mock holder data from CSV
// This would be loaded from the CSV files in a real implementation
export const holdersData = [
  // A subset of data from combined_holders_no_duplicates.csv
  { principal: "nixkj-77c5e-q7qik-ewuhi-hp4gs-oggzq-fj2v5-62cdz-amjrc-pz2nz-oqe", daku_count: 4, gg_count: 0, total_count: 4, already_in_canister: true },
  { principal: "kwte6-azsaw-mek5y-mkcya-4wkkp-fhb76-wzqtt-lwsxz-amgs4-h2wxy-eqe", daku_count: 22, gg_count: 6, total_count: 28, already_in_canister: true },
  { principal: "f2nj3-jtefx-xy4b5-pdfia-he3lj-2nbja-h3d2d-syyro-4piss-5ivqe-sqe", daku_count: 8, gg_count: 0, total_count: 8, already_in_canister: false },
  { principal: "ap2h3-mdvaz-br5tt-s5tst-nap6q-t6kuv-vlwla-a3xvj-f4a4w-4lonn-sqe", daku_count: 2, gg_count: 0, total_count: 2, already_in_canister: false },
  { principal: "l4t4l-264ub-ysr3o-2lovb-md65r-p3mpa-kjk7a-hmmvt-ya7fh-ljoyg-cae", daku_count: 4, gg_count: 0, total_count: 4, already_in_canister: false },
  { principal: "4bxu7-fuuct-otitq-emxde-emjvt-xl46f-scuz6-7yzvy-tlrbz-eeeap-oae", daku_count: 2, gg_count: 0, total_count: 2, already_in_canister: false },
  { principal: "rym5r-a6mj7-wfv3g-lypjx-ejpxa-vvill-eq4nc-wvx2v-l2c47-jym4p-wqe", daku_count: 2, gg_count: 0, total_count: 2, already_in_canister: false },
  { principal: "k3vnz-ukxjv-qvzaz-m6fpu-2sdpt-frpgc-o4rym-teurx-ri24u-clam5-uae", daku_count: 1, gg_count: 0, total_count: 1, already_in_canister: false },
  { principal: "3rtwo-vaa53-j522q-p4v2o-pgxfx-fuv6e-3j4nb-xuo6h-jc6a7-dl5fm-3qe", daku_count: 18, gg_count: 0, total_count: 18, already_in_canister: false },
  { principal: "4zfc6-pn6z2-h7sa2-ahazx-vbmo3-rppde-7x57p-wl723-vpfzm-7krxb-5ae", daku_count: 6, gg_count: 0, total_count: 6, already_in_canister: false },
  { principal: "jt6pq-pfact-6nq4w-xpd7l-jvsh3-ghmvo-yp34h-pmon5-5dcjo-rygay-sqe", daku_count: 100, gg_count: 0, total_count: 100, already_in_canister: true },
  { principal: "nhmua-clb6g-bwq4j-xncof-cst74-57pq6-mv342-iub2s-rs5ec-baibl-nae", daku_count: 20, gg_count: 1, total_count: 21, already_in_canister: false },
  { principal: "va6r7-v33hl-qubvq-oeyfl-a2mbp-dz5s5-h4zgm-dnjnc-s5uyw-mofpn-jae", daku_count: 19, gg_count: 1, total_count: 20, already_in_canister: false },
  { principal: "ybi4b-ho2w6-vmbuh-vlbtg-w2tmm-n2e5o-xfsdn-5i7gt-w4ehe-jrhfl-rae", daku_count: 50, gg_count: 1, total_count: 51, already_in_canister: false },
  { principal: "23jeh-d4pjo-r2biy-e6hrf-tgo36-xqjrg-kkk5h-lmw7p-rch6o-rz2aa-xqe", daku_count: 20, gg_count: 0, total_count: 20, already_in_canister: false },
  { principal: "vbw7f-vrvep-gncha-udzry-v736h-gsf7m-kqyob-hawfi-h2swu-k2vsg-wqe", daku_count: 12, gg_count: 0, total_count: 12, already_in_canister: false },
  { principal: "v7emq-nwbuf-7bbyo-kxeho-zdiqo-xvbqe-ks6ri-7agso-od3kf-l5kdh-lqe", daku_count: 32, gg_count: 1, total_count: 33, already_in_canister: false },
  { principal: "o3nat-3ix22-juqph-xdhyp-krhly-vqk3m-c243q-uxuov-vv4yj-3b4j7-mqe", daku_count: 5, gg_count: 1, total_count: 6, already_in_canister: false },
  { principal: "e7wmz-tpnxb-nwuxd-vgqr6-wg65t-7c2b3-2hyyp-z73dr-iy7yd-4j2wl-lae", daku_count: 129, gg_count: 0, total_count: 129, already_in_canister: false },
  { principal: "ld5uj-tgxfi-jgmdx-ikekg-uu62k-dhhrf-s6jav-3sdbh-4yamx-yzwrs-pqe", daku_count: 299, gg_count: 2372, total_count: 2671, already_in_canister: false }
];

// Generate mock user stats based on holder data
const generateUserStats = (holders) => {
  const now = Date.now() * 1000000; // Convert to nanoseconds
  const oneDay = 24 * 60 * 60 * 1000000000; // 1 day in nanoseconds
  
  return holders.map(holder => {
    const nftCount = holder.total_count;
    const totalValue = nftCount * NFT_VALUE;
    const annualPayout = (totalValue * APY_PERCENT) / 100;
    const payoutPerPeriod = annualPayout / PAYOUTS_PER_YEAR;
    
    // Generate different payout times
    const lastPayoutTime = now - Math.floor(Math.random() * oneDay * 5);
    
    return {
      principal: holder.principal,
      stats: {
        last_payout_time: lastPayoutTime,
        nft_count: BigInt(nftCount),
        last_payout_amount: BigInt(Math.floor(payoutPerPeriod)),
        total_payouts_received: BigInt(Math.floor(payoutPerPeriod * (1 + Math.random() * 10))),
      }
    };
  });
};

// Generate mock global stats
const generateGlobalStats = (holders) => {
  const now = Date.now() * 1000000; // Convert to nanoseconds
  const fiveDays = 5 * 24 * 60 * 60 * 1000000000; // 5 days in nanoseconds
  
  const totalNFTs = holders.reduce((sum, holder) => sum + holder.total_count, 0);
  const totalValue = totalNFTs * NFT_VALUE;
  const annualPayout = (totalValue * APY_PERCENT) / 100;
  const payoutPerPeriod = annualPayout / PAYOUTS_PER_YEAR;
  
  return {
    last_payout_time: now - (2 * 24 * 60 * 60 * 1000000000), // 2 days ago
    total_payouts_processed: BigInt(10),
    total_payout_amount: BigInt(Math.floor(payoutPerPeriod * 10)),
    total_registered_users: BigInt(holders.length),
    next_payout_time: now + (3 * 24 * 60 * 60 * 1000000000), // 3 days from now
    is_processing: false,
    failed_transfers: BigInt(2),
  };
};

// Mock implementations for the canister methods
export const mockPayoutActor = () => {
  const userStats = generateUserStats(holdersData);
  const globalStats = generateGlobalStats(holdersData);
  
  return {
    get_all_user_stats: async () => {
      return userStats.map(user => [
        { toText: () => user.principal },
        user.stats
      ]);
    },
    get_stats: async () => globalStats,
    get_user_stats: async (principal) => {
      const user = userStats.find(u => u.principal === principal.toText());
      return user ? user.stats : null;
    },
    processPayouts: async () => {},
    register: async () => {},
  };
};

export const mockWalletActor = () => {
  return {
    getNFTCount: async (principal) => {
      const holder = holdersData.find(h => h.principal === principal.toText());
      return holder ? BigInt(holder.total_count) : BigInt(0);
    },
    getBalance: async (principal) => {
      // Generate a random balance between 0 and 100 ZOMBIE tokens
      return BigInt(Math.floor(Math.random() * 100 * 100000000));
    },
  };
}; 