import React, { useState, useRef } from 'react';
import axios from 'axios';
import ReCAPTCHA from "react-google-recaptcha";

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
        <div>
            <h2>Public Certificate Verification</h2>
            <input
                type="text"
                value={certificateHash}
                onChange={(e) => setCertificateHash(e.target.value)}
                placeholder="Enter certificate hash"
            />
            <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY!}
                onChange={onRecaptchaChange}
            />
            <button onClick={handleVerify}>Verify</button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {verificationResult && (
                <div>
                    <h3>Verification Result</h3>
                    <p>Is Valid: {verificationResult.is_valid ? 'Yes' : 'No'}</p>
                    <p>Is Revoked: {verificationResult.is_revoked ? 'Yes' : 'No'}</p>
                    {verificationResult.is_valid && (
                        <>
                            <p>Issuer: {verificationResult.issuer}</p>
                            <p>Student: {verificationResult.student}</p>
                            <p>Timestamp: {new Date(verificationResult.timestamp * 1000).toLocaleString()}</p>
                        </>
                    )}
                    {verificationResult.error && <p style={{ color: 'red' }}>{verificationResult.error}</p>}
                </div>
            )}
        </div>
    );
};

export default VerificationPortal;
