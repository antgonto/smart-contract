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
    login: (token: string, roles: string[]) => void;
    logout: () => void;
    adminLogin: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [roles, setRoles] = useState<string[]>(() => {
        const stored = localStorage.getItem('roles');
        if (!stored || stored === 'undefined') return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [isAdmin, setIsAdmin] = useState<boolean>(() => !!localStorage.getItem('isAdmin'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const login = (newToken: string, newRoles: string[]) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('roles', JSON.stringify(newRoles));
        setToken(newToken);
        setRoles(newRoles);
        setIsAdmin(newRoles.includes('Admin'));
        if (newRoles.includes('Admin')) {
            localStorage.setItem('isAdmin', 'true');
        } else {
            localStorage.removeItem('isAdmin');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('roles');
        localStorage.removeItem('isAdmin');
        setToken(null);
        setRoles([]);
        setIsAdmin(false);
    };

    const adminLogin = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await api.post('/admin/login/', { username, password });
            const { token, roles } = res.data;
            login(token, roles.includes('Admin') ? ['Admin'] : roles);
            setSuccess('Admin login successful');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Admin login failed');
        } finally {
            setLoading(false);
        }
    };

    // Compute address, isAuthenticated based on admin or token
    let address = null;
    let isAuthenticated = false;
    if (isAdmin) {
        isAuthenticated = true;
    } else if (token) {
        try {
            const decoded = jwtDecode<{ address: string; roles: string[]; exp: number }>(token);
            if (decoded.exp * 1000 > Date.now()) {
                address = decoded.address;
                isAuthenticated = true;
            }
        } catch (e) {
            // ignore, will be unauthenticated
        }
    }
    const contextValue: AuthContextType = {
        token,
        address,
        roles: isAdmin ? ['admin'] : roles,
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
