import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

interface AuthContextType {
    isAuthenticated: boolean;
    principal: Principal | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [principal, setPrincipal] = useState<Principal | null>(null);
    const [authClient, setAuthClient] = useState<AuthClient | null>(null);

    useEffect(() => {
        const init = async () => {
            const client = await AuthClient.create();
            setAuthClient(client);

            const isAuthenticated = await client.isAuthenticated();
            setIsAuthenticated(isAuthenticated);

            if (isAuthenticated) {
                const identity = client.getIdentity();
                setPrincipal(identity.getPrincipal());
            }
        };

        init();
    }, []);

    const login = async () => {
        if (!authClient) return;

        await new Promise<void>((resolve) => {
            authClient.login({
                identityProvider: process.env.NODE_ENV === 'development' 
                    ? 'http://localhost:4943?canisterId=be2us-64aaa-aaaaa-qaabq-cai'
                    : 'https://identity.ic0.app',
                onSuccess: () => resolve(),
            });
        });

        const identity = authClient.getIdentity();
        setPrincipal(identity.getPrincipal());
        setIsAuthenticated(true);
    };

    const logout = async () => {
        if (!authClient) return;
        await authClient.logout();
        setPrincipal(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, principal, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}; 