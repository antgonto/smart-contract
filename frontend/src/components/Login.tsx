import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { EuiButton, EuiText } from '@elastic/eui';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();

    const handleLogin = async () => {
        setError(null);
        if (!window.ethereum) {
            setError('Please install MetaMask or another Ethereum wallet.');
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            // 1. Get challenge
            const challengeResponse = await api.get(`/auth/challenge/${address}`);
            const nonce = challengeResponse.data.nonce;

            // 2. Sign challenge
            const signature = await signer.signMessage(nonce);

            // 3. Send signature to log in
            const loginResponse = await api.post('/auth/login', {
                address,
                signature,
            });

            const { access } = loginResponse.data;
            login(access);

        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.response?.data?.error || 'An unexpected error occurred during login.');
        }
    };

    return (
        <div>
            <EuiButton onClick={handleLogin} fill>
                Login with Wallet
            </EuiButton>
            {error && (
                <EuiText color="danger" size="s" style={{ marginTop: '10px' }}>
                    <p>{error}</p>
                </EuiText>
            )}
        </div>
    );
};
