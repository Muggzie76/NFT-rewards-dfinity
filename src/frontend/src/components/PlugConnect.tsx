import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';
import './PlugConnect.css';

const PlugLogo = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 7.163 32 16 32C24.837 32 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="white"/>
    <path d="M23.5 16.5C23.5 20.366 20.366 23.5 16.5 23.5C12.634 23.5 9.5 20.366 9.5 16.5C9.5 12.634 12.634 9.5 16.5 9.5C20.366 9.5 23.5 12.634 23.5 16.5Z" fill="#4F46E5"/>
  </svg>
);

declare global {
  interface Window {
    ic: {
      plug: {
        requestConnect: (options?: {
          whitelist?: string[];
          host?: string;
          timeout?: number;
        }) => Promise<any>;
        isConnected: () => Promise<boolean>;
        disconnect: () => Promise<void>;
        createActor: <T>(options: any) => Promise<T>;
        agent: any;
        principalId: string;
        accountId: string;
      };
    };
  }
}

interface PlugConnectProps {
  onConnect?: (principal: string) => void;
  onDisconnect?: () => void;
}

const PlugConnect: React.FC<PlugConnectProps> = ({ onConnect, onDisconnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const whitelist = [
    'rce3q-iaaaa-aaaap-qpyfa-cai', // wallet canister
    'zeqfj-qyaaa-aaaaf-qanua-cai', // payout canister
    'zksib-liaaa-aaaaf-qanva-cai'  // frontend canister
  ];

  const verifyConnection = async () => {
    try {
      const connected = await window.ic.plug.isConnected();
      if (connected) {
        setIsConnected(true);
        const principal = await window.ic.plug.principalId;
        onConnect?.(principal);
      }
    } catch (e) {
      console.error('Error verifying connection:', e);
    }
  };

  useEffect(() => {
    verifyConnection();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const publicKey = await window.ic.plug.requestConnect({
        whitelist,
        host: 'https://icp0.io',
        timeout: 50000
      });
      
      if (publicKey) {
        setIsConnected(true);
        const principal = await window.ic.plug.principalId;
        onConnect?.(principal);
      }
    } catch (e) {
      console.error('Error connecting to Plug wallet:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.ic.plug.disconnect();
      setIsConnected(false);
      onDisconnect?.();
    } catch (e) {
      console.error('Error disconnecting from Plug wallet:', e);
    }
  };

  return (
    <div className="plug-connect">
      {!isConnected ? (
        <button 
          onClick={handleConnect}
          disabled={isLoading}
          className="connect-button"
        >
          <PlugLogo />
          {isLoading ? 'Connecting...' : 'Connect with Plug'}
        </button>
      ) : (
        <button 
          onClick={handleDisconnect}
          className="disconnect-button"
        >
          Disconnect Plug
        </button>
      )}
    </div>
  );
};

export default PlugConnect; 