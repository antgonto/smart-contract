import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { checkRoles } from '../services/api';
import { EuiButton, EuiText, EuiFieldText, EuiSpacer, EuiModal, EuiModalHeader, EuiModalBody, EuiModalFooter, EuiFieldPassword } from '@elastic/eui';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

interface LoginProps {
    isOpen: boolean;
    onClose: () => void;
    loginType: 'admin' | 'user';
}

export const Login: React.FC<LoginProps> = ({ isOpen, onClose, loginType }) => {
    const [error, setError] = useState<string | null>(null);
    const [address, setAddress] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [nonce, setNonce] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, adminLogin } = useAuth();
    const navigate = useNavigate();

    // Reset state when modal is closed or login type changes
    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setAddress('');
            setPrivateKey('');
            setNonce('');
            setUsername('');
            setPassword('');
        }
    }, [isOpen]);

    const handleGetChallenge = async () => {
        setError(null);
        setNonce('');
        try {
            const challengeResponse = await api.get(`/app/v1/smartcontracts/auth/challenge/${address.split(' ')[0]}`);
            setNonce(challengeResponse.data.nonce);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get challenge.');
        }
    };

    const handleAdminLogin = async () => {
        setError(null);
        try {
            await adminLogin(username, password);
            onClose();
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to login as admin.');
        }
    };

    const handleLogin = async () => {
        if (!privateKey || !nonce) {
            setError('Private key and a challenge (nonce) are required for login.');
            return;
        }
        try {
            // The nonce is already in the state from handleGetChallenge, no need to fetch it again.
            // Sign the nonce (challenge) with the private key using ethers.js
            const wallet = new ethers.Wallet(privateKey);
            const signature = await wallet.signMessage(nonce);
            const loginResponse = await api.post('/app/v1/smartcontracts/auth/login', {
                address: address.split(' ')[0],
                signature, // Send the signature, not the private key
            });
            const { access, refresh } = loginResponse.data;
            // Blockchain role verification
            const rolesResponse = await checkRoles(address.split(' ')[0]);
            const roles = rolesResponse.roles || [];
            if (roles.length === 0) {
                setError('No blockchain role assigned to this address.');
                return;
            }
            login(access, roles);
            onClose(); // Close modal on successful login
        } catch (err: any) {
            console.error('Login failed', err);
            setError(err.response?.data?.error || 'An unexpected error occurred during login.');
        }
    };

    if (!isOpen) return null;

    return (
        <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
            <EuiModalHeader>
                <EuiText><h1>{loginType === 'admin' ? 'Admin Login' : 'User Login'}</h1></EuiText>
            </EuiModalHeader>

            <EuiModalBody>
                {loginType === 'admin' ? (
                    <>
                        <EuiFieldText
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            aria-label="Username"
                        />
                        <EuiSpacer />
                        <EuiFieldPassword
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-label="Password"
                        />
                    </>
                ) : (
                    <>
                        <EuiFieldText
                            placeholder="Enter your wallet address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            aria-label="Wallet Address"
                        />
                        <EuiSpacer />
                        <EuiButton onClick={handleGetChallenge} disabled={!address}>Get Challenge</EuiButton>
                        <EuiSpacer />
                        {nonce && (
                            <EuiText size="s" color="subdued">Challenge: {nonce}</EuiText>
                        )}
                        <EuiSpacer />
                        <EuiFieldText
                            placeholder="Enter your private key to sign the challenge"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            disabled={!nonce}
                            aria-label="Private Key"
                        />
                    </>
                )}
                {error && (
                    <>
                        <EuiSpacer />
                        <EuiText color="danger">{error}</EuiText>
                    </>
                )}
            </EuiModalBody>

            <EuiModalFooter>
                <EuiButton onClick={onClose} color="text">
                    Cancel
                </EuiButton>
                <EuiButton onClick={loginType === 'admin' ? handleAdminLogin : handleLogin} fill disabled={loginType === 'user' && !privateKey}>
                    Login
                </EuiButton>
            </EuiModalFooter>
        </EuiModal>
    );
};
