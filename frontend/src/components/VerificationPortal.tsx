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
    EuiSwitch
} from '@elastic/eui';

const VerificationPortal = () => {
    const [certificateHash, setCertificateHash] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const [studentCertificates, setStudentCertificates] = useState<any[]>([]);
    const [issuerCertificates, setIssuerCertificates] = useState<any[]>([]);
    const [verifierCertHash, setVerifierCertHash] = useState('');
    const [verifierResult, setVerifierResult] = useState<any>(null);
    const [onChainRecipient, setOnChainRecipient] = useState('');
    const [onChainIpfsCid, setOnChainIpfsCid] = useState('');
    const [onChainCertHash, setOnChainCertHash] = useState('');
    const [useOnChain, setUseOnChain] = useState(true);

    useEffect(() => {
        const studentAddress = window.localStorage.getItem('student_address');
        if (studentAddress) {
            axios.get(`/app/v1/smartcontracts/smartcontract/list_certificates_by_student/?student_address=${studentAddress}`)
                .then(res => setStudentCertificates(res.data.certificates))
                .catch(() => setStudentCertificates([]));
        }
        const issuerAddress = window.localStorage.getItem('issuer_address');
        if (issuerAddress) {
            axios.get(`/app/v1/smartcontracts/smartcontract/list_certificates_by_issuer/?issuer_address=${issuerAddress}`)
                .then(res => setIssuerCertificates(res.data.certificates))
                .catch(() => setIssuerCertificates([]));
        }
    }, []);

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
            const response = await axios.get(`/app/v1/smartcontracts/smartcontract/verify_certificate/${certificateHash}`);
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
                        <>
                            <EuiSpacer size="m" />
                            {verificationResult.error ? (
                                <EuiCallOut color="danger" title="Verification Failed">{verificationResult.error}</EuiCallOut>
                            ) : (
                                <>
                                    <EuiCallOut color="success" title="Certificate Found">
                                        <div><b>Issuer:</b> {verificationResult.issuer}</div>
                                        <div><b>Student:</b> {verificationResult.student}</div>
                                        <div><b>Timestamp:</b> {verificationResult.timestamp ? new Date(verificationResult.timestamp * 1000).toLocaleString() : '-'}</div>
                                        <div><b>Revoked:</b> {verificationResult.is_revoked ? 'Yes' : 'No'}</div>
                                        <div><b>IPFS CID:</b> {verificationResult.ipfs_hash || '-'}</div>
                                    </EuiCallOut>
                                    <EuiSpacer size="m" />
                                    <EuiFormRow label="Enter IPFS CID to download diploma" fullWidth>
                                        <EuiFieldText
                                            value={""}
                                            onChange={(e) => setCertificateHash(e.target.value)}
                                            placeholder="Enter IPFS CID"
                                            fullWidth
                                            disabled={false}
                                        />
                                    </EuiFormRow>
                                    <EuiSpacer size="m" />
                                    <EuiButton
                                        fill
                                        iconType="download"
                                        onClick={async () => {
                                            if (!certificateHash) {
                                                alert('Please enter an IPFS CID.');
                                                return;
                                            }
                                            try {
                                                const res = await axios.get(`/app/v1/smartcontracts/smartcontract/download_offchain/${certificateHash}`, { responseType: 'blob' });
                                                const url = window.URL.createObjectURL(res.data);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.setAttribute('download', `${certificateHash}.pdf`);
                                                document.body.appendChild(link);
                                                link.click();
                                                link.parentNode?.removeChild(link);
                                                window.URL.revokeObjectURL(url);
                                            } catch (e) {
                                                alert('Failed to download diploma.');
                                            }
                                        }}
                                    >
                                        Download Diploma
                                    </EuiButton>
                                </>
                            )}
                        </>
                    )}
                    <EuiSpacer size="l" />
                    <EuiCallOut color="primary" title="Register Certificate (Issuer)">
                        <EuiFormRow label="Storage Type">
                            <EuiSwitch
                                label={useOnChain ? 'On-Chain' : 'Off-Chain (IPFS only)'}
                                checked={useOnChain}
                                onChange={e => setUseOnChain(e.target.checked)}
                            />
                        </EuiFormRow>
                        <EuiFormRow label="Recipient Address">
                            <EuiFieldText value={onChainRecipient} onChange={e => setOnChainRecipient(e.target.value)} placeholder="0x..." />
                        </EuiFormRow>
                        <EuiFormRow label="IPFS CID (optional)">
                            <EuiFieldText value={onChainIpfsCid} onChange={e => setOnChainIpfsCid(e.target.value)} placeholder="IPFS CID" />
                        </EuiFormRow>
                        <EuiFormRow label="Certificate Hash">
                            <EuiFieldText value={onChainCertHash} onChange={e => setOnChainCertHash(e.target.value)} placeholder="Certificate Hash (hex)" />
                        </EuiFormRow>
                        <EuiButton fill onClick={async () => {
                            try {
                                if (useOnChain) {
                                    await axios.post('/app/v1/smartcontracts/smartcontract/register_onchain/', {
                                        cert_hash: onChainCertHash,
                                        recipient: onChainRecipient,
                                        ipfs_cid: onChainIpfsCid
                                    });
                                    alert('Certificate registered on-chain!');
                                } else {
                                    await axios.post('/app/v1/smartcontracts/smartcontract/upload_offchain', {
                                        recipient: onChainRecipient,
                                        ipfs_cid: onChainIpfsCid,
                                        cert_hash: onChainCertHash
                                    });
                                    alert('Certificate registered off-chain (IPFS)!');
                                }
                            } catch (e) {
                                alert('Failed to register certificate.');
                            }
                        }}>{useOnChain ? 'Register On-Chain' : 'Register Off-Chain'}</EuiButton>
                    </EuiCallOut>
                    <EuiSpacer size="l" />
                    <EuiCallOut color="primary" title="Student Certificates (On-Chain)">
                        {studentCertificates.length === 0 ? <div>No certificates found.</div> : (
                            <ul>
                                {studentCertificates.map(cert => (
                                    <li key={cert.cert_hash}>
                                        Hash: {cert.cert_hash}, Issuer: {cert.issuer}, IPFS CID: {cert.ipfs_hash}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </EuiCallOut>
                    <EuiSpacer size="l" />
                    <EuiCallOut color="primary" title="Issuer Certificates (On-Chain)">
                        {issuerCertificates.length === 0 ? <div>No certificates found.</div> : (
                            <ul>
                                {issuerCertificates.map(cert => (
                                    <li key={cert.cert_hash}>
                                        Hash: {cert.cert_hash}, Student: {cert.recipient}, IPFS CID: {cert.ipfs_hash}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </EuiCallOut>
                    <EuiSpacer size="l" />
                    <EuiCallOut color="primary" title="Verifier: Validate Certificate (On-Chain)">
                        <EuiFormRow label="Certificate Hash">
                            <EuiFieldText value={verifierCertHash} onChange={e => setVerifierCertHash(e.target.value)} placeholder="Certificate Hash (hex)" />
                        </EuiFormRow>
                        <EuiButton fill onClick={async () => {
                            try {
                                const res = await axios.get(`/app/v1/smartcontracts/smartcontract/validate_certificate/?cert_hash=${verifierCertHash}`);
                                setVerifierResult(res.data);
                            } catch (e) {
                                setVerifierResult({ error: 'Not found or invalid.' });
                            }
                        }}>Validate</EuiButton>
                        {verifierResult && (
                            verifierResult.error ? <div style={{color:'red'}}>{verifierResult.error}</div> :
                            <div>
                                <div><b>Issuer:</b> {verifierResult.issuer}</div>
                                <div><b>Student:</b> {verifierResult.student}</div>
                                <div><b>Issued At:</b> {verifierResult.issued_at}</div>
                                <div><b>IPFS CID:</b> {verifierResult.ipfs_cid}</div>
                                <div><b>Role:</b> {verifierResult.role}</div>
                            </div>
                        )}
                    </EuiCallOut>
                    <EuiSpacer size="l" />
                </EuiCard>
            </EuiPageBody>
        </EuiPage>
    );
};

export default VerificationPortal;
