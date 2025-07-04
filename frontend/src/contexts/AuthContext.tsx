import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
    token: string | null;
    address: string | null;
    roles: string[];
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const authState = useMemo(() => {
        if (!token) {
            return { token: null, address: null, roles: [], isAuthenticated: false };
        }

        try {
            const decoded = jwtDecode<{ address: string; roles: string[]; exp: number }>(token);
            if (decoded.exp * 1000 < Date.now()) {
                logout();
                return { token: null, address: null, roles: [], isAuthenticated: false };
            }
            return { token, address: decoded.address, roles: decoded.roles, isAuthenticated: true };
        } catch (e) {
            logout();
            return { token: null, address: null, roles: [], isAuthenticated: false };
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
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
