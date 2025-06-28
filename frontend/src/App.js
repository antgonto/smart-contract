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

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SettingsMenu from "./pages/SettingsMenu";

function App() {
  return (
    <EuiProvider colorMode="dark">
      <BrowserRouter>
        <EuiPage style={{ height: '100vh' }}>
          <EuiFlexGroup style={{ width: '100%', height: '100%' }} gutterSize="none">
            <EuiFlexItem grow={false}>
              <Sidebar />
            </EuiFlexItem>

            <EuiFlexItem>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                {/*<Route path="/users" element={<UsersList />} />*/}
                {/*<Route path="/assets" element={<AssetsList />} />*/}
                {/*<Route path="/vulnerabilities" element={<VulnerabilityList />} />*/}
                {/*<Route path="/alerts" element={<AlertsPage />} />*/}
                {/*<Route path="/incidents" element={<IncidentsPage />} />*/}
                {/*<Route path="/threat_intelligence" element={<ThreatIntelligenceList />} />*/}
                {/*<Route path="/dashboard" element={<IncidentDashboard />} />*/}
                {/*<Route path="/risk_dashboard" element={<IncidentRiskDashboard />} />*/}
                <Route path="/settings" element={<SettingsMenu />} />
                {/* Additional routes can be added here */}
              </Routes>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPage>
      </BrowserRouter>
    </EuiProvider>
  );
}

export default App;
