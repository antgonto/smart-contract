import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  EuiProvider,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage
} from '@elastic/eui';

import '@elastic/eui/dist/eui_theme_amsterdam_light.json';
import '@elastic/eui/dist/eui_theme_amsterdam_dark.json';

import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import SettingsMenu from "./pages/SettingsMenu";
import RegisterCertificate from "./pages/RegisterCertificate";
import CertificatesList from "./pages/CertificatesList";
import VerificationPortal from './components/VerificationPortal';
import Dashboard from "./pages/Dashboard";
import AllAccountsView from './pages/AllAccountsView';
import CreateWalletView from './pages/CreateWalletView';
import StudentDiplomas from "./pages/StudentDiplomas";
import VerifyCertificate from "./pages/VerifyCertificate";

function App() {
  return (
    <AuthProvider>
      <EuiProvider colorMode="dark">
        <BrowserRouter>
          <EuiPage style={{ height: '100vh' }}>
            <EuiFlexGroup style={{ width: '100%', height: '100%' }} gutterSize="none">
              <EuiFlexItem grow={false}>
                <Sidebar />
              </EuiFlexItem>

              <EuiFlexItem>
                <Routes>
                  <Route path="/" element={<></>} />
                  <Route path="/metrics" element={<Dashboard />} />
                  <Route path="/register-certificate" element={<RegisterCertificate />} />
                  <Route path="/settings" element={<SettingsMenu />} />
                  <Route path="/all-accounts" element={<AllAccountsView />} />
                  <Route path="/certificates" element={<CertificatesList />} />
                  <Route path="/verify-certificate" element={<VerificationPortal />} />
                  <Route path="/create-wallet" element={<CreateWalletView />} />
                  <Route path="/my-diplomas" element={<StudentDiplomas />} />
                  {/* Additional routes can be added here */}
                </Routes>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPage>
        </BrowserRouter>
      </EuiProvider>
    </AuthProvider>
  );
}

export default App;
