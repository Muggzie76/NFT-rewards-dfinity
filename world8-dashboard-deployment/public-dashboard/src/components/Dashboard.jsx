import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createPayoutActor, createWalletActor, formatStats, formatUserStats } from '../utils/agent';

// Styled components
const DashboardContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: black;
  color: #ffffff;
  display: grid;
  grid-template-columns: 350px 1fr 350px;
  grid-template-rows: 80px 1fr 1fr 40px;
  gap: 15px;
  padding: 15px;
  box-sizing: border-box;
  overflow-x: hidden;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto auto auto;
    height: auto;
    min-height: 100vh;
    gap: 12px;
    padding: 12px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 10px;
    padding: 10px;
  }
`;

const Header = styled.header`
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: rgba(0, 31, 61, 0.3);
  border: 1px solid rgba(0, 102, 204, 0.3);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 102, 204, 0.1);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
    text-align: center;
    padding: 12px;
    h1 {
      font-size: 1.2em;
      color: #00ffff;
    }
    div {
      font-size: 0.8em;
    }
  }
`;

const Panel = styled.div`
  background: rgba(0, 31, 61, 0.3);
  border: 1px solid rgba(0, 102, 204, 0.3);
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 0 20px rgba(0, 102, 204, 0.1);
  overflow: auto;
  max-height: 50vh;
  
  @media (max-width: 1200px) {
    grid-column: span 1;
    max-height: 60vh;
  }
  
  @media (max-width: 768px) {
    grid-column: 1;
    padding: 15px;
    max-height: 40vh;
    font-size: 0.9em;
  }
  
  h2 {
    color: #00ffff;
    font-size: 1.2em;
    margin-bottom: 15px;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  div {
    margin-bottom: 10px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    @media (max-width: 768px) {
      font-size: 0.9em;
    }
    
    th, td {
      padding: 8px 4px;
      text-align: left;
      
      @media (max-width: 768px) {
        padding: 6px 2px;
      }
    }
    
    th {
      color: #00ffff;
    }
  }
`;

const CenterDisplay = styled.div`
  grid-column: 2;
  grid-row: 2 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  gap: 20px;
  height: auto;
  min-height: 400px;
  
  @media (max-width: 1200px) {
    grid-column: span 2;
    grid-row: auto;
    min-height: 50vh;
  }
  
  @media (max-width: 768px) {
    grid-column: 1;
    min-height: 50vh;
    gap: 15px;
  }
`;

const StatsCounter = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: clamp(18px, 5vw, 36px);
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  z-index: 1;
  background: rgba(0, 11, 30, 0.7);
  padding: 10px 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 102, 204, 0.3);
  width: fit-content;
  text-align: center;
  
  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 100%;
    box-sizing: border-box;
  }
`;

const GlobeContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 300px;
  position: relative;
  
  @media (max-width: 768px) {
    height: 50vh;
    min-height: 250px;
  }
`;

const CountdownTimer = styled.div`
  background: rgba(0, 31, 61, 0.5);
  border: 1px solid rgba(0, 102, 204, 0.5);
  border-radius: 4px;
  padding: 15px 30px;
  text-align: center;
  width: fit-content;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 10px 20px;
    width: 100%;
    box-sizing: border-box;
  }

  .countdown-label {
    color: #00ffff;
    font-size: 1.1em;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    
    @media (max-width: 768px) {
      font-size: 1em;
    }
  }

  .countdown-value {
    font-size: 1.4em;
    font-weight: bold;
    color: #ffffff;
    
    @media (max-width: 768px) {
      font-size: 1.2em;
    }
    
    span {
      background: rgba(0, 102, 204, 0.3);
      padding: 6px 12px;
      border-radius: 4px;
      margin: 0 2px;
      min-width: 40px;
      display: inline-block;
      
      @media (max-width: 768px) {
        padding: 4px 8px;
        min-width: 30px;
      }
    }
    
    .separator {
      color: #00ffff;
      margin: 0 4px;
    }
  }
`;

const WelcomeText = styled.div`
  color: #00ffff;
  font-size: 1.5em;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  text-align: center;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    font-size: 1.2em;
    margin-bottom: 10px;
  }
`;

const Footer = styled.footer`
  grid-column: 1 / -1;
  grid-row: 4;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 31, 61, 0.3);
  border: 1px solid rgba(0, 102, 204, 0.3);
  border-radius: 4px;
  padding: 10px;
  color: #00ffff;
  font-size: 0.9em;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  
  @media (max-width: 1200px) {
    grid-row: auto;
  }
  
  @media (max-width: 768px) {
    padding: 15px;
    text-align: center;
    flex-wrap: wrap;
  }

  a {
    color: #00ffff;
    text-decoration: none;
    margin: 0 5px;
    &:hover {
      text-decoration: underline;
    }
  }
`;

// Add this style for responsive tables
const ResponsiveTableContainer = styled.div`
  overflow-x: auto;
  width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 102, 204, 0.3);
    border-radius: 3px;
  }
  
  table {
    min-width: 400px;
    width: 100%;
  }
`;

// Simplified sphere with black and red checkerboard pattern
const AnimatedSphere = () => {
  const sphereRef = useRef();
  const innerSphereRef = useRef();
  
  useFrame(({ clock }) => {
    if (sphereRef.current && innerSphereRef.current) {
      const isMobile = window.innerWidth <= 768;
      const speed = isMobile ? 0.001 : 0.003;
      
      // Rotate outer sphere one way
      sphereRef.current.rotation.x += speed;
      sphereRef.current.rotation.y += speed * 0.7;
      
      // Rotate inner sphere the opposite way for interesting pattern
      innerSphereRef.current.rotation.x -= speed * 1.5;
      innerSphereRef.current.rotation.y -= speed;
    }
  });

  return (
    <group>
      {/* Outer black wireframe sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[2, window.innerWidth <= 768 ? 16 : 24, window.innerWidth <= 768 ? 16 : 24]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.7}
          roughness={0.2}
          emissive="#330000"
          emissiveIntensity={0.4}
          wireframe={true}
        />
      </mesh>
      
      {/* Inner red wireframe sphere with offset rotation */}
      <mesh ref={innerSphereRef}>
        <sphereGeometry args={[1.75, window.innerWidth <= 768 ? 12 : 20, window.innerWidth <= 768 ? 12 : 20]} />
        <meshStandardMaterial 
          color="#ff0000" 
          metalness={0.8}
          roughness={0.1}
          emissive="#ff0000"
          emissiveIntensity={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      
      {/* Small glowing core */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#ff3300"
          emissive="#ff0000"
          emissiveIntensity={2}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

// Simplified Globe component with enhanced lighting
const Globe = () => {
  return (
    <GlobeContainer>
      <Canvas>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 5, 15]} />
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} color="#ffffff" intensity={0.7} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff0000" />
        <AnimatedSphere />
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          autoRotate 
          autoRotateSpeed={0.5}
          minDistance={3}
          maxDistance={8}
        />
      </Canvas>
    </GlobeContainer>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStaked: 0,
    totalRewards: 0,
    activeStakers: 0,
    averageStake: 0,
    lastPayoutTime: 0,
    nextPayoutTime: 0,
    isProcessing: false
  });

  const [rewardsHistory, setRewardsHistory] = useState([]);
  const [topStakers, setTopStakers] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00' });

  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        setLoading(true);
        const payoutActor = createPayoutActor();
        const walletActor = createWalletActor();
        
        // Fetch global stats
        const globalStats = await payoutActor.get_stats();
        const formattedStats = formatStats(globalStats);
        
        // Fetch all user stats
        const allUserStats = await payoutActor.get_all_user_stats();
        const userStatsArray = await Promise.all(
          allUserStats.map(async ([principal, stats]) => {
            const nftCount = await walletActor.getNFTCount(principal);
            return {
              principal: principal.toText(),
              ...formatUserStats(stats),
              currentNFTs: Number(nftCount)
            };
          })
        );

        // Calculate distribution data
        const distribution = calculateDistribution(userStatsArray);
        setDistributionData(distribution);

        // Sort and set top stakers
        const sortedStakers = userStatsArray
          .sort((a, b) => b.currentNFTs - a.currentNFTs)
          .slice(0, 5)
          .map((staker, index) => ({
            rank: index + 1,
            address: `${staker.principal.slice(0, 5)}...${staker.principal.slice(-4)}`,
            amount: staker.currentNFTs,
            rewardRate: ((staker.totalPayoutsReceived / staker.currentNFTs) * 100).toFixed(2) + '%'
          }));
        setTopStakers(sortedStakers);

        // Generate rewards history
        const history = generateRewardsHistory(userStatsArray);
        setRewardsHistory(history);

        setStats({
          ...formattedStats,
          activeStakers: userStatsArray.length,
          averageStake: userStatsArray.reduce((acc, curr) => acc + curr.currentNFTs, 0) / userStatsArray.length
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching rewards data:', err);
        setError('Failed to fetch rewards data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const calculateNextUpdate = () => {
      const now = new Date();
      const noon = new Date(now);
      const midnight = new Date(now);
      
      noon.setHours(12, 0, 0, 0);
      midnight.setHours(0, 0, 0, 0);
      
      if (now.getHours() >= 12) {
        // If it's past noon, target midnight of next day
        midnight.setDate(midnight.getDate() + 1);
        setNextUpdate(midnight);
        return midnight.getTime() - now.getTime();
      } else if (now.getHours() >= 0) {
        // If it's past midnight but before noon, target noon
        setNextUpdate(noon);
        return noon.getTime() - now.getTime();
      }
    };

    // Update countdown every minute
    const updateCountdown = () => {
      if (nextUpdate) {
        const now = new Date();
        const diff = nextUpdate.getTime() - now.getTime();
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          setCountdown({
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0')
          });
        }
      }
    };

    // Initial fetch and countdown setup
    fetchRewardsData();
    const timeUntilNextUpdate = calculateNextUpdate();
    updateCountdown();

    // Update countdown every minute
    const countdownInterval = setInterval(updateCountdown, 60000);

    // Schedule next data fetch
    const fetchTimeout = setTimeout(() => {
      fetchRewardsData();
      calculateNextUpdate();
    }, timeUntilNextUpdate);

    // Cleanup
    return () => {
      clearTimeout(fetchTimeout);
      clearInterval(countdownInterval);
    };
  }, []); // Empty dependency array since we handle updates internally

  const calculateDistribution = (userStats) => {
    const ranges = [
      { name: '1-10 NFTs', min: 1, max: 10 },
      { name: '11-50 NFTs', min: 11, max: 50 },
      { name: '51-100 NFTs', min: 51, max: 100 },
      { name: '100+ NFTs', min: 101, max: Infinity }
    ];

    return ranges.map(range => {
      const count = userStats.filter(user => 
        user.currentNFTs >= range.min && user.currentNFTs <= range.max
      ).length;
      return {
        name: range.name,
        value: (count / userStats.length * 100).toFixed(1)
      };
    });
  };

  const generateRewardsHistory = (userStats) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, index) => {
      const monthIndex = (currentMonth - 5 + index + 12) % 12;
      const value = userStats.reduce((acc, user) => acc + user.currentNFTs, 0);
      return {
        month: `${month} ${new Date().getFullYear()}`,
        value: value
      };
    });
  };

  return (
    <DashboardContainer>
      <Header>
        <div>
          <h1>World 8 Rewards Dashboard</h1>
        </div>
        <div>{new Date().toLocaleString()}</div>
      </Header>

      <Panel>
        <h2>Rewards Overview</h2>
        <StatsCounter style={{ position: 'static', transform: 'none' }}>
          {stats.totalStaked.toLocaleString()} NFTs
        </StatsCounter>
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#00ffff', marginBottom: '10px' }}>Key Metrics</h3>
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>
            <div>Total Rewards: {stats.totalRewards.toLocaleString()} Zombie</div>
            <div>Active Stakers: {stats.activeStakers.toLocaleString()}</div>
            <div>Average Stake: {stats.averageStake.toFixed(2)} NFTs</div>
          </div>
        </div>
      </Panel>

      <CenterDisplay>
        <WelcomeText>Welcome to WORLD 8 Rewards</WelcomeText>
        <CountdownTimer>
          <div className="countdown-label">Next Update In</div>
          <div className="countdown-value">
            <span>{countdown.hours}</span>
            <span className="separator">:</span>
            <span>{countdown.minutes}</span>
          </div>
        </CountdownTimer>
        <GlobeContainer>
          <Globe />
        </GlobeContainer>
      </CenterDisplay>

      <Panel>
        <h2>Rewards History</h2>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rewardsHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="month" 
                stroke="#00ffff"
                tick={{ fill: '#00ffff', fontSize: '0.8em' }}
              />
              <YAxis 
                stroke="#00ffff"
                tick={{ fill: '#00ffff', fontSize: '0.8em' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 31, 61, 0.8)', 
                  border: '1px solid #00ffff',
                  borderRadius: '4px',
                  color: '#ffffff'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00ffff" 
                strokeWidth={2}
                dot={{ fill: '#00ffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <h2>Top Stakers</h2>
        <ResponsiveTableContainer>
          <table style={{ width: '100%', color: 'rgba(255,255,255,0.8)' }}>
            <thead>
              <tr style={{ color: '#00ffff' }}>
                <th>Rank</th>
                <th>Address</th>
                <th>NFTs</th>
                <th>Rewards Rate</th>
              </tr>
            </thead>
            <tbody>
              {topStakers.map((staker) => (
                <tr key={staker.rank}>
                  <td>#{staker.rank}</td>
                  <td>{staker.address}</td>
                  <td>{staker.amount.toLocaleString()}</td>
                  <td>{staker.rewardRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTableContainer>
      </Panel>

      <Panel>
        <h2>NFT Distribution</h2>
        <ResponsiveTableContainer>
          <table style={{ width: '100%', color: 'rgba(255,255,255,0.8)' }}>
            <thead>
              <tr style={{ color: '#00ffff' }}>
                <th>Range</th>
                <th>Percentage</th>
                <th>Stakers</th>
              </tr>
            </thead>
            <tbody>
              {distributionData.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.value}%</td>
                  <td>{Math.floor(stats.activeStakers * (parseFloat(item.value) / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTableContainer>
      </Panel>

      <Footer>
        Copyright <a href="http://www.world8.io" target="_blank" rel="noopener noreferrer">WORLD8.io</a>. Created by Muggzie
      </Footer>
    </DashboardContainer>
  );
};

export default Dashboard; 