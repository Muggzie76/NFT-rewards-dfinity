import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

interface AuthContextType {
    identity: Identity | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    identity: null,
    login: async () => {},
    logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [identity, setIdentity] = useState<Identity | null>(null);

    useEffect(() => {
        // Check for existing identity on mount
        AuthClient.create().then(client => {
            if (client.isAuthenticated()) {
                setIdentity(client.getIdentity());
            }
        });
    }, []);

    const login = async () => {
        const client = await AuthClient.create();
        await client.login({
            identityProvider: 'https://identity.ic0.app',
            onSuccess: () => {
                setIdentity(client.getIdentity());
            },
        });
    };

    const logout = async () => {
        const client = await AuthClient.create();
        await client.logout();
        setIdentity(null);
    };

    return (
        <AuthContext.Provider value={{ identity, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}; 