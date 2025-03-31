// Mock data and utility functions for the dashboard
import { mockData } from './mockData';

// Simulate fetching data with a delay
const fetchData = async (dataType) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockData[dataType] || []);
    }, 500);
  });
};

// Format numbers with commas
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Fetch stats for dashboard
export const fetchStats = async () => {
  const data = await fetchData('stats');
  return data;
};

// Fetch NFT distribution data
export const fetchNFTDistribution = async () => {
  const data = await fetchData('nftDistribution');
  return data;
};

// Fetch top holders data
export const fetchTopHolders = async () => {
  const data = await fetchData('topHolders');
  return data;
};

// Fetch rewards distribution data
export const fetchRewardsDistribution = async () => {
  const data = await fetchData('rewardsDistribution');
  return data;
};

// Fetch staking statistics
export const fetchStakingStats = async () => {
  const data = await fetchData('stakingStats');
  return data;
};

// Fetch collection distribution
export const fetchCollectionDistribution = async () => {
  const data = await fetchData('collectionDistribution');
  return data;
};

// Fetch holdings distribution
export const fetchHoldingsDistribution = async () => {
  const data = await fetchData('holdingsDistribution');
  return data;
};

// Truncate address for display
export const truncateAddress = (address) => {
  if (!address) return '';
  const start = address.slice(0, 6);
  const end = address.slice(-4);
  return `${start}...${end}`;
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
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