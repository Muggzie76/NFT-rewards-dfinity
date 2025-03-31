// Mock data for the dashboard
export const mockData = {
  // Stats for the stats cards
  stats: {
    totalHolders: 128,
    totalNFTs: 4109,
    dakuNFTs: 1630,
    ggAlbumNFTs: 2479,
    stakingRate: 69.3
  },
  
  // Top holders data
  topHolders: [
    { rank: 1, principalId: 'kwte6-az...eqe', dakuNFTs: 22, ggAlbumNFTs: 6, totalNFTs: 28, stakedPercentage: 20, rewardsEarned: '497 $W8' },
    { rank: 2, principalId: 'f2nj3-jt...sqe', dakuNFTs: 8, ggAlbumNFTs: 0, totalNFTs: 8, stakedPercentage: 29, rewardsEarned: '8070 $W8' },
    { rank: 3, principalId: 'njxkj-77...oqe', dakuNFTs: 4, ggAlbumNFTs: 0, totalNFTs: 4, stakedPercentage: 92, rewardsEarned: '1147 $W8' },
    { rank: 4, principalId: 'l4t4l-26...cae', dakuNFTs: 4, ggAlbumNFTs: 0, totalNFTs: 4, stakedPercentage: 63, rewardsEarned: '7479 $W8' },
    { rank: 5, principalId: 'ap2h3-md...sqe', dakuNFTs: 2, ggAlbumNFTs: 0, totalNFTs: 2, stakedPercentage: 99, rewardsEarned: '7402 $W8' },
    { rank: 6, principalId: '', dakuNFTs: 1, ggAlbumNFTs: 1, totalNFTs: 2, stakedPercentage: 49, rewardsEarned: '3555 $W8' },
    { rank: 7, principalId: '4bxu7-fu...oae', dakuNFTs: 2, ggAlbumNFTs: 0, totalNFTs: 2, stakedPercentage: 49, rewardsEarned: '2037 $W8' }
  ],
  
  // Recent rewards distribution
  rewardsDistribution: [
    { time: '3/26/2025, 10:37:31 AM', principalId: 'njxkj-77...oqe', nftCount: 34, w8Amount: 3450, txnHash: '0xbdb41c5857' },
    { time: '3/26/2025, 9:37:31 AM', principalId: 'kwte6-az...eqe', nftCount: 50, w8Amount: 2313, txnHash: '0x4224dbf917' },
    { time: '3/26/2025, 8:37:31 AM', principalId: 'f2nj3-jt...sqe', nftCount: 25, w8Amount: 1326, txnHash: '0x9993ffade8' },
    { time: '3/26/2025, 7:37:31 AM', principalId: 'ap2h3-md...sqe', nftCount: 2, w8Amount: 1864, txnHash: '0xbd416f56d5' },
    { time: '3/26/2025, 6:37:31 AM', principalId: '', nftCount: 3, w8Amount: 4920, txnHash: '0x096b9fbc01' }
  ],
  
  // Staking statistics for the chart
  stakingStats: [
    { month: 'Jan', value: 1500 },
    { month: 'Feb', value: 1800 },
    { month: 'Mar', value: 2200 },
    { month: 'Apr', value: 2500 },
    { month: 'May', value: 2700 },
    { month: 'Jun', value: 2800 },
    { month: 'Jul', value: 2900 }
  ],
  
  // Holdings distribution data for the bar chart
  holdingsDistribution: [
    { range: '1-10 NFTs', percentage: 62 },
    { range: '11-50 NFTs', percentage: 27 },
    { range: '51-100 NFTs', percentage: 7 },
    { range: '101-500 NFTs', percentage: 3 },
    { range: '500+ NFTs', percentage: 1 }
  ],
  
  // Collection distribution data for the pie chart
  collectionDistribution: [
    { name: 'Daku NFTs', value: 1630 },
    { name: 'GG Album NFTs', value: 2479 }
  ],
  
  // Collections data
  collections: [
    { id: 1, name: 'Grungy Geezers', image: 'grungy_geezers.jpg' },
    { id: 2, name: 'Daku Motokos', image: 'daku_motokos.jpg' },
    { id: 3, name: 'IC Zombies', image: 'ic_zombies.jpg' }
  ]
}; 