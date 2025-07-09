import React, { createContext, useState, useContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import axios from 'axios';
import { Wallet } from 'ethers';

interface AuthState {
    token: string | null;
    address: string | null;
    roles: string[];
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    success: string | null;
}

interface AuthContextType extends AuthState {
    login: (token: string, roles: string[]) => void;
    logout: () => void;
    issuerLogin: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [roles, setRoles] = useState<string[]>([]);
    const [isIssuer, setIsIssuer] = useState<boolean>(() => !!localStorage.getItem('isIssuer'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const login = (newToken: string, newRoles: string[]) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('roles', JSON.stringify(newRoles));
        setToken(newToken);
        setRoles(newRoles);
        setIsIssuer(newRoles.includes('Issuer'));
        if (newRoles.includes('Issuer')) {
            localStorage.setItem('isIssuer', 'true');
        } else {
            localStorage.removeItem('isIssuer');
        }
        // Write the address to logged.txt after login ONLY if Student (from decoded JWT)
        try {
            const decoded = jwtDecode<{ address?: string; roles: string[]; exp: number; privateKey?: string }>(newToken);
            let address = undefined;
            // Use address from JWT if it looks like a valid Ethereum address
            if (decoded.address && /^0x[a-fA-F0-9]{40}$/.test(decoded.address)) {
                address = decoded.address;
            } else if (decoded.privateKey && /^0x[a-fA-F0-9]{64}$/.test(decoded.privateKey)) {
                // Only derive address if privateKey looks valid
                const wallet = new Wallet(decoded.privateKey);
                address = wallet.address;
            }
            // Only store the address if the current login is for a Student (not Issuer)
            if (address && decoded.roles && decoded.roles.includes('Student') && !decoded.roles.includes('Issuer')) {
                axios.post('/app/v1/smartcontracts/logged-address', { address });
            }
        } catch (e) {
            // ignore
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('roles');
        localStorage.removeItem('isIssuer');
        setToken(null);
        setRoles([]);
        setIsIssuer(false);
    };

    const issuerLogin = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await api.post('/issuer/login/', { username, password });
            const { token, roles } = res.data;
            login(token, roles.includes('Issuer') ? ['Issuer'] : roles);
            setSuccess('Issuer login successful');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Issuer login failed');
        } finally {
            setLoading(false);
        }
    };

    // Compute address, isAuthenticated based on issuer or token
    let address = null;
    let isAuthenticated = false;
    if (isIssuer) {
        isAuthenticated = true;
    } else if (token) {
        try {
            const decoded = jwtDecode<{ address: string; roles: string[]; exp: number }>(token);
            if (decoded.exp * 1000 > Date.now()) {
                address = decoded.address;
                // If roles in state are empty, populate them from the token.
                if (roles.length === 0 && decoded.roles) {
                    setRoles(decoded.roles);
                }
                isAuthenticated = true;
            }
        } catch (e) {
            // ignore, will be unauthenticated
        }
    }
    const contextValue: AuthContextType = {
        token,
        address,
        roles: isIssuer ? ['Issuer'] : roles,
        isAuthenticated,
        loading,
        error,
        success,
        login,
        logout,
        issuerLogin,
    };
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
