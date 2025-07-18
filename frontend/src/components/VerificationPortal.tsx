import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReCAPTCHA from "react-google-recaptcha";
import {
    EuiForm,
    EuiFormRow,
    EuiFieldText,
    EuiButton,
    EuiCallOut,
    EuiSpacer,
    EuiCard,
    EuiPage,
    EuiPageBody,
} from '@elastic/eui';
import { verifyCertificateDetails, downloadCertificateOffchain } from '../services/api';
import { saveAs } from 'file-saver';

const VerificationPortal = () => {
    const [certificateHash, setCertificateHash] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const recaptchaRef = useRef<any>(null);

    const handleVerify = async () => {
        if (!certificateHash) {
            setError('Please enter a certificate hash.');
            return;
        }
        if (!recaptchaToken) {
            setError('Please complete the reCAPTCHA.');
            return;
        }
        setError('');
        setVerificationResult(null);

        try {
            const response = await verifyCertificateDetails(certificateHash);
            setVerificationResult(response);
        } catch (err) {
            setError('An error occurred while verifying the certificate.');
            console.error(err);
        } finally {
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
            setRecaptchaToken(null);
        }
    };

    const onRecaptchaChange = (token: string | null) => {
        setRecaptchaToken(token);
    };

    const handleDownload = async () => {
        if (!verificationResult) return;

        const { storage_mode, ipfs_hash, pdf_on_chain, cert_hash } = verificationResult;

        if (storage_mode === 'OFF_CHAIN' && ipfs_hash) {
            try {
                const blob = await downloadCertificateOffchain(ipfs_hash);
                saveAs(blob, `${ipfs_hash}.pdf`);
            } catch (e) {
                setError('Failed to download off-chain certificate.');
            }
        } else if (storage_mode === 'ON_CHAIN' && pdf_on_chain) {
            try {
                const byteCharacters = atob(Buffer.from(pdf_on_chain, 'hex').toString('base64'));
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                saveAs(blob, `${cert_hash || 'certificate'}.pdf`);
            } catch (e) {
                setError('Failed to process or download on-chain certificate.');
            }
        } else {
            setError('Certificate data is not available for download.');
        }
    };

    return (
        <EuiPage style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EuiPageBody component="div" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <EuiCard title="Public Certificate Verification" style={{ minWidth: 400, maxWidth: 500, width: '100%' }}>
                    <EuiSpacer size="m" />
                    <EuiForm component="form" onSubmit={e => { e.preventDefault(); handleVerify(); }}>
                        <EuiFormRow label="Certificate Hash" fullWidth>
                            <EuiFieldText
                                value={certificateHash}
                                onChange={(e) => setCertificateHash(e.target.value)}
                                placeholder="Enter certificate hash"
                                fullWidth
                                disabled={!!verificationResult}
                            />
                        </EuiFormRow>
                        <EuiFormRow label="reCAPTCHA" fullWidth>
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY!}
                                onChange={onRecaptchaChange}
                            />
                        </EuiFormRow>
                        <EuiSpacer />
                        <EuiButton type="submit" fill isDisabled={!!verificationResult}>Verify</EuiButton>
                    </EuiForm>
                    <EuiSpacer size="m" />
                    {error && <EuiCallOut color="danger" title="Error">{error}</EuiCallOut>}
                    {verificationResult && (
                        <>
                            <EuiSpacer size="m" />
                            {verificationResult.error ? (
                                <EuiCallOut color="danger" title="Verification Failed">{verificationResult.error}</EuiCallOut>
                            ) : (
                                <>
                                    <EuiCallOut color="success" title="Certificate Found">
                                        <div><b>Issuer:</b> {verificationResult.issuer}</div>
                                        <div><b>Student:</b> {verificationResult.student}</div>
                                        <div><b>Timestamp:</b> {verificationResult.issued_at ? new Date(verificationResult.issued_at * 1000).toLocaleString() : '-'}</div>
                                        <div><b>Revoked:</b> {verificationResult.is_revoked ? 'Yes' : 'No'}</div>
                                        <div><b>Storage Mode:</b> {verificationResult.storage_mode}</div>
                                        {verificationResult.storage_mode === 'OFF_CHAIN' && <div><b>IPFS CID:</b> {verificationResult.ipfs_hash || '-'}</div>}
                                    </EuiCallOut>
                                    <EuiSpacer />
                                    <EuiButton
                                        fill
                                        iconType="download"
                                        onClick={handleDownload}
                                        isDisabled={!verificationResult || (verificationResult.storage_mode === 'ON_CHAIN' && !verificationResult.pdf_on_chain) || (verificationResult.storage_mode === 'OFF_CHAIN' && !verificationResult.ipfs_hash)}
                                    >
                                        Download Diploma
                                    </EuiButton>
                                </>
                            )}
                        </>
                    )}
                </EuiCard>
            </EuiPageBody>
        </EuiPage>
    );
};

export default VerificationPortal;
