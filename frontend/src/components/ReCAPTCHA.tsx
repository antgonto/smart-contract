import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface ReCAPTCHAProps {
  onChange: (token: string | null) => void;
}

const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

const ReCAPTCHAWidget: React.FC<ReCAPTCHAProps> = ({ onChange }) => {
  return (
    <div style={{ margin: '16px 0' }}>
      <ReCAPTCHA
        sitekey={SITE_KEY}
        onChange={onChange}
      />
    </div>
  );
};

export default ReCAPTCHAWidget;
