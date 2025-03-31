import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  fetchStats,
  fetchTopHolders,
  fetchRewardsDistribution,
  fetchStakingStats,
  fetchHoldingsDistribution,
  fetchCollectionDistribution,
  formatNumber,
  formatDate
} from '../utils/agent';
import CollectionCard from './CollectionCard';
import { 
  grungyGeezersImg, 
  dakuMotokosImg, 
  icZombiesImg,
  grungyGeezersImgAlt,
  dakuMotokosImgAlt,
  icZombiesImgAlt,
  fallbackPixel
} from '../assets/images.js';

// Styled components
const Dashboard = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 100vh;
  background-color: #0a0a0a;
  color: #ffffff;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
`;

const Sidebar = styled.div`
  background-color: #141414;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  overflow-y: auto;
  max-height: 100vh;
  
  @media (max-width: 768px) {
    grid-row: 2;
    max-height: 50vh;
    overflow-x: auto;
    padding: 15px;
    display: flex;
    flex-direction: row;
    gap: 15px;
    
    /* Make sidebar horizontal scrollable on mobile */
    flex-wrap: nowrap;
    white-space: nowrap;
    
    /* Hide scrollbar */
    &::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none; /* Firefox */
  }
`;

const SidebarNavigation = styled.div`
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #333;
`;

const SidebarItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 5px;
  
  &:hover {
    background-color: #2a2a2a;
  }
  
  &.active {
    background-color: #c10000;
  }
  
  svg {
    margin-right: 10px;
  }
  
  @media (max-width: 768px) {
    min-width: 160px;
  }
`;

const CollectionContainer = styled.div`
  padding: 20px 15px;
  
  @media (max-width: 768px) {
    margin-top: 0;
    display: flex;
    gap: 15px;
    padding: 0;
    
    /* Make collection cards scrollable on mobile */
    > * {
      min-width: 180px;
    }
  }
`;

const Content = styled.div`
  padding: 20px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    grid-row: 1;
    overflow-y: visible;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  
  h1 {
    font-size: 24px;
    color: #ffffff;
  }
  
  .date {
    font-size: 14px;
    color: #aaa;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    
    h1 {
      margin-bottom: 10px;
    }
  }
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  background-color: #1a1a1a;
  padding: 10px 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  
  a {
    display: flex;
    align-items: center;
    color: #ffffff;
    margin-right: 20px;
    font-size: 14px;
    
    svg {
      margin-right: 5px;
    }
  }
  
  @media (max-width: 768px) {
    overflow-x: auto;
    padding: 10px;
    
    a {
      white-space: nowrap;
    }
  }
`;

const CollectionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  flex: 1;
  gap: 10px;
  
  button {
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #333;
    color: #fff;
    cursor: pointer;
    
    &:hover {
      background-color: #444;
    }
    
    &.active {
      background-color: #c10000;
    }
  }
  
  @media (max-width: 768px) {
    margin-top: 10px;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 15px;
  
  .stat-icon {
    color: #c10000;
    margin-bottom: 10px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .stat-label {
    font-size: 12px;
    color: #aaa;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 15px;
  height: 300px;
  
  h3 {
    font-size: 16px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    
    svg {
      margin-right: 8px;
      color: #c10000;
    }
  }
`;

const Table = styled.div`
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  
  h3 {
    font-size: 16px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    
    svg {
      margin-right: 8px;
      color: #c10000;
    }
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    
    th {
      font-weight: 500;
      color: #aaa;
    }
    
    tbody tr:hover {
      background-color: #222;
    }
  }
  
  @media (max-width: 768px) {
    overflow-x: auto;
    
    table {
      min-width: 600px;
    }
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 15px;
  border-top: 1px solid #333;
  font-size: 14px;
  color: #aaa;
  
  .social-icons {
    display: flex;
    gap: 15px;
    
    svg {
      color: #c10000;
    }
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
`;

// Color constants
const COLORS = ['#0088FE', '#FF0000'];

// AmazingDashboard component
const AmazingDashboard = () => {
  const [stats, setStats] = useState({});
  const [topHolders, setTopHolders] = useState([]);
  const [rewardsDistribution, setRewardsDistribution] = useState([]);
  const [stakingStats, setStakingStats] = useState([]);
  const [holdingsDistribution, setHoldingsDistribution] = useState([]);
  const [collectionDistribution, setCollectionDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [imageUrls, setImageUrls] = useState({
    grungyGeezers: grungyGeezersImg,
    dakuMotokos: dakuMotokosImg,
    icZombies: icZombiesImg
  });
  
  // Collection data for sidebar
  const collections = [
    {
      title: "Grungy Geezers",
      image: grungyGeezersImg,
      stats: [
        { icon: "⚡", value: "95%", color: "#c10000" },
        { icon: "💎", value: "87%", color: "#c10000" },
        { icon: "🎸", value: "92%", color: "#c10000" }
      ],
      actionText: "BUY GEEZER"
    },
    {
      title: "Daku Motokos #714",
      image: dakuMotokosImg,
      stats: [],
      actionText: "BUY DAKU MOTOKOS"
    },
    {
      title: "IC ZOMBIES",
      image: icZombiesImg,
      stats: [],
      actionText: "BUY ZOMBIE"
    }
  ];
  
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [
          statsData,
          topHoldersData,
          rewardsDistData,
          stakingStatsData,
          holdingsDistData,
          collectionDistData
        ] = await Promise.all([
          fetchStats(),
          fetchTopHolders(),
          fetchRewardsDistribution(),
          fetchStakingStats(),
          fetchHoldingsDistribution(),
          fetchCollectionDistribution()
        ]);
        
        setStats(statsData);
        setTopHolders(topHoldersData);
        setRewardsDistribution(rewardsDistData);
        setStakingStats(stakingStatsData);
        setHoldingsDistribution(holdingsDistData);
        setCollectionDistribution(collectionDistData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);
  
  // Image error fallback handler
  useEffect(() => {
    const preloadImages = () => {
      // Try to preload primary images
      const imageLoaders = [
        { primary: grungyGeezersImg, alt: grungyGeezersImgAlt, key: 'grungyGeezers' },
        { primary: dakuMotokosImg, alt: dakuMotokosImgAlt, key: 'dakuMotokos' },
        { primary: icZombiesImg, alt: icZombiesImgAlt, key: 'icZombies' }
      ];
      
      imageLoaders.forEach(({ primary, alt, key }) => {
        const img = new Image();
        img.onerror = () => {
          console.log(`Primary image failed for ${key}, trying alternate`);
          
          // Try alternate URL if primary fails
          const imgAlt = new Image();
          imgAlt.onerror = () => {
            console.log(`Alternate image also failed for ${key}, using fallback`);
            setImageUrls(prev => ({ ...prev, [key]: fallbackPixel }));
          };
          imgAlt.onload = () => {
            setImageUrls(prev => ({ ...prev, [key]: alt }));
          };
          imgAlt.src = alt;
        };
        img.src = primary;
      });
    };
    
    preloadImages();
  }, []);
  
  // Handler for collection card button clicks
  const handleCollectionAction = (collection) => {
    console.log(`Action clicked for ${collection.title}`);
    // Handle click action (e.g., redirect to buy page)
  };
  
  // Format date for header
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  if (loading) {
    return <div>Loading dashboard data...</div>;
  }
  
  return (
    <Dashboard>
      <Sidebar>
        <SidebarNavigation>
          <SidebarItem className="active">
            <span>Dashboard</span>
          </SidebarItem>
          <SidebarItem>
            <span>Analytics</span>
          </SidebarItem>
          <SidebarItem>
            <span>Staking</span>
          </SidebarItem>
        </SidebarNavigation>
        
        <CollectionContainer>
          <CollectionCard 
            title="Grungy Geezers"
            image={imageUrls.grungyGeezers}
            actionText="BUY GEEZER"
            stats={[
              { icon: "⚡", value: "95%", color: "#c10000" },
              { icon: "💎", value: "87%", color: "#c10000" },
              { icon: "🎸", value: "92%", color: "#c10000" }
            ]}
            onClick={() => alert('Buy Grungy Geezer clicked!')}
          />
          
          <CollectionCard 
            title="Daku Motokos #714"
            image={imageUrls.dakuMotokos}
            actionText="BUY DAKU MOTOKOS"
            onClick={() => alert('Buy Daku Motoko clicked!')}
          />
          
          <CollectionCard 
            title="IC ZOMBIES"
            image={imageUrls.icZombies}
            actionText="BUY ZOMBIE"
            onClick={() => alert('Buy IC Zombie clicked!')}
          />
        </CollectionContainer>
      </Sidebar>
      
      <Content>
        <Header>
          <h1>World 8 NFT Rewards Dashboard</h1>
          <div className="date">{currentDate}</div>
        </Header>
        
        <ActionBar>
          <a href="#">
            <span>Buy WORLD 8 Merch Now</span>
          </a>
          
          <CollectionButtons>
            <button className="active">Grungy Geezers</button>
            <button>Daku Motokos</button>
            <button>IC Zombies</button>
          </CollectionButtons>
        </ActionBar>
        
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">👥</div>
            <div className="stat-value">{formatNumber(stats.totalHolders)}</div>
            <div className="stat-label">Total Holders</div>
          </StatCard>
          
          <StatCard>
            <div className="stat-icon">🖼️</div>
            <div className="stat-value">{formatNumber(stats.totalNFTs)}</div>
            <div className="stat-label">NFTs Minted</div>
          </StatCard>
          
          <StatCard>
            <div className="stat-icon">🔴</div>
            <div className="stat-value">{formatNumber(stats.dakuNFTs)}</div>
            <div className="stat-label">Daku Collection</div>
          </StatCard>
          
          <StatCard>
            <div className="stat-icon">🎵</div>
            <div className="stat-value">{formatNumber(stats.ggAlbumNFTs)}</div>
            <div className="stat-label">GG Collection</div>
          </StatCard>
          
          <StatCard>
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.stakingRate}%</div>
            <div className="stat-label">of Total NFTs</div>
          </StatCard>
        </StatsGrid>
        
        <ChartsGrid>
          <ChartCard>
            <h3>
              <span>Staking Statistics</span>
            </h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={stakingStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          
          <ChartCard>
            <h3>
              <span>Holdings Distribution</span>
            </h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={holdingsDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="percentage" fill="#FF0000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          
          <ChartCard>
            <h3>
              <span>Collection Distribution</span>
            </h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={collectionDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {collectionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </ChartsGrid>
        
        <Table>
          <h3>
            <span>Top Holders</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Principal ID</th>
                <th>Daku NFTs</th>
                <th>GG Album NFTs</th>
                <th>Total NFTs</th>
                <th>% Staked</th>
                <th>Rewards Earned</th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((holder) => (
                <tr key={holder.rank}>
                  <td>{holder.rank}</td>
                  <td>{holder.principalId}</td>
                  <td>{holder.dakuNFTs}</td>
                  <td>{holder.ggAlbumNFTs}</td>
                  <td>{holder.totalNFTs}</td>
                  <td>{holder.stakedPercentage}%</td>
                  <td>{holder.rewardsEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
        
        <Table>
          <h3>
            <span>Recent Rewards Distribution</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Principal ID</th>
                <th>NFT Count</th>
                <th>$W8 Amount</th>
                <th>TXN Hash</th>
              </tr>
            </thead>
            <tbody>
              {rewardsDistribution.map((dist, index) => (
                <tr key={index}>
                  <td>{dist.time}</td>
                  <td>{dist.principalId}</td>
                  <td>{dist.nftCount}</td>
                  <td>{dist.w8Amount}</td>
                  <td>{dist.txnHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
        
        <Footer>
          <div>© 2023-2024 World 8 NFT Platform | Terms of Service | Privacy Policy | FAQ | Contact</div>
          <div className="social-icons">
            <span>🐦</span>
            <span>🎮</span>
            <span>⭕</span>
            <span>🐙</span>
          </div>
        </Footer>
      </Content>
    </Dashboard>
  );
};

export default AmazingDashboard; 