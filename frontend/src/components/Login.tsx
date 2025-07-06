import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { EuiButton, EuiText, EuiFieldText, EuiSpacer, EuiModal, EuiModalHeader, EuiModalBody, EuiModalFooter, EuiFieldPassword } from '@elastic/eui';

export const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [address, setAddress] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [nonce, setNonce] = useState('');
    const [signature, setSignature] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { login } = useAuth();

    const handleGetChallenge = async () => {
        setError(null);
        setNonce('');
        setSignature('');
        try {
            const challengeResponse = await api.get(`/app/v1/smartcontracts/auth/challenge/${address}`);
            setNonce(challengeResponse.data.nonce);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get challenge.');
        }
    };

    const handleSignChallenge = async () => {
        setError(null);
        try {
            const response = await api.post('/app/v1/smartcontracts/auth/sign_challenge', {
                private_key: privateKey,
                nonce: nonce,
            });
            setSignature(response.data.signature);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to sign challenge.');
        }
    };

    const handleLogin = async () => {
        setError(null);
        try {
            const loginResponse = await api.post('/app/v1/smartcontracts/auth/login', {
                address,
                signature,
            });
            const { access } = loginResponse.data;
            login(access);
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Login failed', err);
            setError(err.response?.data?.error || 'An unexpected error occurred during login.');
        }
    };

    return (
        <>
            <EuiButton onClick={() => setIsModalOpen(true)} fill>Login</EuiButton>
            {isModalOpen && (
                <EuiModal onClose={() => setIsModalOpen(false)}>
                    <EuiModalHeader><EuiText><h2>Login with Wallet</h2></EuiText></EuiModalHeader>
                    <EuiModalBody>
                        <EuiFieldText
                            placeholder="Enter wallet address"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            fullWidth
                        />
                        <EuiSpacer size="m" />
                        <EuiButton onClick={handleGetChallenge} fill disabled={!address}>
                            Get Challenge
                        </EuiButton>
                        {nonce && (
                            <>
                                <EuiSpacer size="m" />
                                <EuiText size="s">
                                    <p>Challenge (nonce): <code>{nonce}</code></p>
                                </EuiText>
                                <EuiSpacer size="m" />
                                <EuiFieldPassword
                                    placeholder="Enter private key to sign challenge"
                                    value={privateKey}
                                    onChange={e => setPrivateKey(e.target.value)}
                                    fullWidth
                                />
                                <EuiSpacer size="s" />
                                <EuiButton onClick={handleSignChallenge} disabled={!privateKey}>
                                    Sign Challenge
                                </EuiButton>
                                <EuiSpacer size="m" />
                                <EuiFieldText
                                    placeholder="Signature will appear here"
                                    value={signature}
                                    readOnly
                                    fullWidth
                                />
                                <EuiSpacer size="m" />
                                <EuiButton onClick={handleLogin} fill disabled={!signature}>
                                    Login
                                </EuiButton>
                            </>
                        )}
                        {error && (
                            <EuiText color="danger" size="s" style={{ marginTop: '10px' }}>
                                <p>{error}</p>
                            </EuiText>
                        )}
                    </EuiModalBody>
                    <EuiModalFooter>
                        <EuiButton onClick={() => setIsModalOpen(false)} color="text">Cancel</EuiButton>
                    </EuiModalFooter>
                </EuiModal>
            )}
        </>
    );
};
