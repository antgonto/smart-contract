import React, { createContext, useState, useContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

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
    login: (token: string) => void;
    logout: () => void;
    adminLogin: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isAdmin, setIsAdmin] = useState<boolean>(() => !!localStorage.getItem('isAdmin'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setIsAdmin(false); // Ensure admin state is cleared
        localStorage.removeItem('isAdmin');
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        setToken(null);
        setIsAdmin(false);
    };

    const adminLogin = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await api.post('/api/admin/login/', { username, password });
            if (response.data.success) {
                setSuccess('Admin login successful');
                localStorage.setItem('isAdmin', 'true');
                setIsAdmin(true);
                setToken(null); // Clear any existing user token
                localStorage.removeItem('token');
            } else {
                setError(response.data.error || 'Invalid credentials');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred during admin login.');
        }
        setLoading(false);
    };

    // Compute address, roles, isAuthenticated based on admin or token
    let address = null;
    let roles: string[] = [];
    let isAuthenticated = false;
    if (isAdmin) {
        roles = ['admin'];
        isAuthenticated = true;
    } else if (token) {
        try {
            const decoded = jwtDecode<{ address: string; roles: string[]; exp: number }>(token);
            if (decoded.exp * 1000 > Date.now()) {
                address = decoded.address;
                roles = decoded.roles;
                isAuthenticated = true;
            }
        } catch (e) {
            // ignore, will be unauthenticated
        }
    }
    const contextValue: AuthContextType = {
        token,
        address,
        roles,
        isAuthenticated,
        loading,
        error,
        success,
        login,
        logout,
        adminLogin,
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
