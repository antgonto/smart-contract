import React, { useState, useRef } from 'react';
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
    EuiPageBody
} from '@elastic/eui';

const VerificationPortal = () => {
    const [certificateHash, setCertificateHash] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const recaptchaRef = useRef<ReCAPTCHA>(null);

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
            const response = await axios.post(`/api/public/verify/${certificateHash}`, {
                recaptchaToken: recaptchaToken
            });
            setVerificationResult(response.data);
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
                        <EuiCallOut color={verificationResult.is_valid ? 'success' : 'danger'} title="Verification Result">
                            <p>Is Valid: {verificationResult.is_valid ? 'Yes' : 'No'}</p>
                            <p>Is Revoked: {verificationResult.is_revoked ? 'Yes' : 'No'}</p>
                            {verificationResult.is_valid && (
                                <>
                                    <p>Issuer: {verificationResult.issuer}</p>
                                    <p>Student: {verificationResult.student}</p>
                                </>
                            )}
                        </EuiCallOut>
                    )}
                </EuiCard>
            </EuiPageBody>
        </EuiPage>
    );
};

export default VerificationPortal;
