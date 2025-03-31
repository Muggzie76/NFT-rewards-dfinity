import React, { useState } from 'react';
import styled from 'styled-components';

const Card = styled.div`
  background-color: #141414;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  max-width: 200px;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 Aspect Ratio */
  overflow: hidden;
  
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
`;

const CollectionTitle = styled.div`
  background-color: #1a1a1a;
  padding: 10px;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
`;

const StatsContainer = styled.div`
  padding: 5px;
  background-color: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const StatBar = styled.div`
  display: flex;
  align-items: center;
  margin: 5px 0;
  gap: 5px;
`;

const CircleIcon = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #8364e2;
  font-size: 10px;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.value || '0%'};
    background-color: ${props => props.color || '#8364e2'};
    border-radius: 2px;
  }
`;

const StatValue = styled.div`
  font-size: 11px;
  color: #fff;
  min-width: 38px;
  text-align: right;
`;

const NavControls = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background-color: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const NavButton = styled.button`
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    color: #fff;
  }
`;

const ActionButton = styled.button`
  background-color: #c10000;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 0;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
  width: 100%;
  margin-top: 5px;
  
  &:hover {
    background-color: #e00000;
  }
`;

const DakuTitle = styled.div`
  background-color: #1a1a1a;
  padding: 10px;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  
  span {
    color: #666;
    font-size: 12px;
  }
`;

const DakuStatsContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(15, 15, 20, 0.8);
  padding: 8px;
  display: flex;
  justify-content: space-between;
`;

const DakuStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .icon {
    color: #8364e2;
    font-size: 12px;
    margin-bottom: 2px;
  }
  
  .value {
    font-size: 11px;
    margin-bottom: 2px;
  }
  
  .progress {
    width: 40px;
    height: 4px;
    background-color: #333;
    border-radius: 2px;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${props => props.value || '92%'};
      background-color: #8364e2;
      border-radius: 2px;
    }
  }
`;

// CollectionCard component
const CollectionCard = ({ title, image, stats = [], actionText, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    console.error(`Failed to load image for ${title}`);
    setImageError(true);
  };
  
  const renderPlaceholder = (title) => {
    // Custom placeholders that resemble the actual images
    if (title === "Grungy Geezers") {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#333',
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: '#c10000',
            marginBottom: '5px'
          }}></div>
          <div style={{ 
            width: '80px', 
            height: '25px', 
            backgroundColor: '#222',
            backgroundImage: 'linear-gradient(45deg, #333 25%, #999 25%, #999 50%, #333 50%, #333 75%, #999 75%, #999 100%)',
            backgroundSize: '10px 10px',
            marginBottom: '5px' 
          }}></div>
          <div style={{ 
            width: '60px', 
            height: '10px', 
            backgroundColor: 'gold'
          }}></div>
        </div>
      );
    } else if (title === "Daku Motokos" || title === "Daku Motokos #714") {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#222',
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            backgroundColor: '#333',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              right: '10px',
              top: '15px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'gold'
            }}></div>
            <div style={{
              position: 'absolute',
              left: '-5px',
              bottom: '-5px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: '#0077ff'
            }}></div>
          </div>
        </div>
      );
    } else if (title === "IC ZOMBIES") {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#111',
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '2px solid #444',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ color: '#99cccc', fontWeight: 'bold', fontSize: '16px' }}>IC</div>
            <div style={{ color: '#99cccc', fontWeight: 'bold', fontSize: '14px' }}>ZOMBIES</div>
            <div style={{ color: '#c10000', fontSize: '10px', marginTop: '5px' }}>ON ICPSWAP</div>
          </div>
        </div>
      );
    } else {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#222',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0
        }}>
          <div style={{ textAlign: 'center' }}>
            <div>{title}</div>
            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '5px' }}>Image not available</div>
          </div>
        </div>
      );
    }
  };
  
  // Daku Motokos specific card
  if (title === "Daku Motokos #714") {
    return (
      <Card>
        <ImageContainer>
          {!imageError ? (
            <img 
              src={image} 
              alt={title} 
              onError={handleImageError}
            />
          ) : renderPlaceholder(title)}
          <DakuStatsContainer>
            <DakuStat value="92%">
              <div className="icon">⬆️</div>
              <div className="value">92%</div>
              <div className="progress"></div>
            </DakuStat>
            <DakuStat value="87%">
              <div className="icon">🔄</div>
              <div className="value">87%</div>
              <div className="progress"></div>
            </DakuStat>
            <DakuStat value="76%">
              <div className="icon">⚡</div>
              <div className="value">76%</div>
              <div className="progress"></div>
            </DakuStat>
          </DakuStatsContainer>
        </ImageContainer>
        <DakuTitle>
          {title} <span>#714</span>
        </DakuTitle>
        <NavControls>
          <NavButton>◀</NavButton>
          <NavButton>▶</NavButton>
        </NavControls>
        <StatsContainer>
          <ActionButton onClick={onClick}>{actionText || "BUY DAKU MOTOKOS"}</ActionButton>
        </StatsContainer>
      </Card>
    );
  }
  
  // IC ZOMBIES specific card
  if (title === "IC ZOMBIES") {
    return (
      <Card>
        <ImageContainer>
          {!imageError ? (
            <img 
              src={image} 
              alt={title} 
              onError={handleImageError}
            />
          ) : renderPlaceholder(title)}
        </ImageContainer>
        <ActionButton onClick={onClick}>{actionText || "BUY ZOMBIE"}</ActionButton>
      </Card>
    );
  }
  
  // Default card (used for Grungy Geezers and other collections)
  return (
    <Card>
      <ImageContainer>
        {!imageError ? (
          <img 
            src={image} 
            alt={title} 
            onError={handleImageError}
          />
        ) : renderPlaceholder(title)}
      </ImageContainer>
      <CollectionTitle>{title}</CollectionTitle>
      {stats.length > 0 && (
        <StatsContainer>
          {stats.map((stat, index) => (
            <StatBar key={index}>
              <CircleIcon>{stat.icon || "•"}</CircleIcon>
              <ProgressBar value={stat.value} color={stat.color} />
              <StatValue>{stat.displayValue || stat.value}</StatValue>
            </StatBar>
          ))}
        </StatsContainer>
      )}
      {actionText && <ActionButton onClick={onClick}>{actionText}</ActionButton>}
    </Card>
  );
};

export default CollectionCard; 