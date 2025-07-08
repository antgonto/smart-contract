import * as React from 'react';
import {
  EuiSideNav,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login } from './Login';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, roles } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [loginType, setLoginType] = React.useState<'admin' | 'user'>('user');

  const navItems = {
    login: {
      id: 'login',
      name: 'Login',
      onClick: () => setIsLoginModalOpen(true),
      icon: <EuiIcon type="user" />,
    },
    logout: {
      id: 'logout',
      name: 'Logout',
      icon: <EuiIcon type="exit" />,
      onClick: () => {
        logout();
        navigate('/');
      },
    },
    verifyCertificate: {
      id: 'verify-certificate',
      name: 'Verify Certificate',
      onClick: () => navigate('/verify-certificate'),
      isSelected: location.pathname === '/verify-certificate',
      icon: <EuiIcon type="checkInCircleFilled" />,
    },
    settings: {
      id: 'settings',
      name: 'Settings',
      onClick: () => navigate('/settings'),
      isSelected: location.pathname === '/settings',
      icon: <EuiIcon type="gear" />,
    },
    myDiplomas: {
      id: 'my-diplomas',
      name: 'My Diplomas',
      onClick: () => navigate('/my-diplomas'),
      isSelected: location.pathname === '/my-diplomas',
      icon: <EuiIcon type="starEmpty" />,
    },
    issuerDashboard: {
      id: 'issuer-dashboard',
      name: 'Issuer Dashboard',
      onClick: () => navigate('/issuer-dashboard'),
      isSelected: location.pathname === '/issuer-dashboard',
      icon: <EuiIcon type="user" />,
    },
    registerCertificate: {
      id: 'register-certificate',
      name: 'Register Certificate',
      onClick: () => navigate('/register-certificate'),
      isSelected: location.pathname === '/register-certificate',
      icon: <EuiIcon type="document" />,
    },
    certificates: {
      id: 'certificates',
      name: 'My Certificates',
      onClick: () => navigate('/certificates'),
      isSelected: location.pathname === '/certificates',
      icon: <EuiIcon type="indexOpen" />,
    },
    wallet: {
      id: 'wallet',
      name: 'Transactions',
      onClick: () => navigate('/wallet'),
      isSelected: location.pathname === '/wallet',
      icon: <EuiIcon type="currency" />,
    },
    createWallet: {
        id: 'create-wallet',
        name: 'Create Wallet',
        onClick: () => navigate('/create-wallet'),
        isSelected: location.pathname === '/create-wallet',
        icon: <EuiIcon type="plusInCircle" />,
    },
    accounts: {
        id: 'all-accounts',
        name: 'Accounts',
        onClick: () => navigate('/all-accounts'),
        isSelected: location.pathname === '/all-accounts',
        icon: <EuiIcon type="tableDensityNormal" />,
    },
    telemetryDashboard: {
        id: 'telemetry-dashboard',
        name: 'Telemetry Dashboard',
        onClick: () => navigate('/metrics'),
        isSelected: location.pathname === '/metrics',
        icon: <EuiIcon type="dashboardApp" />,
    },
  };

  let visibleItems: any[] = [];

  if (isAuthenticated) {
    if (roles.includes('Student')) {
      visibleItems = [
        navItems.myDiplomas,
        navItems.logout,
      ];
    } else if (roles.includes('Issuer')) {
      visibleItems = [
        navItems.telemetryDashboard,
        navItems.wallet,
        navItems.registerCertificate,
        navItems.accounts,
        navItems.issuerDashboard,
        navItems.createWallet,
        navItems.logout,
      ];
    }
  } else {
    visibleItems = [
      navItems.login,
      navItems.verifyCertificate,
      navItems.settings,
    ];
  }

  const sideNavItems = [
    {
      name: 'Blockchain Platform',
      id: 0,
      items: visibleItems,
    },
  ];

  return (
    <>
      <div style={{ width: '200px', height: '100%', background: '#1a1c21', padding: '16px' }}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="securityApp" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <h2 style={{ margin: 0 }}>Smart Contracts</h2>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiSideNav items={sideNavItems} />

        {isAuthenticated && roles.length > 0 && (
          <div style={{ position: 'absolute', bottom: '20px', width: '168px' }}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="s">
                  <p>Role: {roles[0]}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}

        <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} loginType={loginType} />
      </div>
    </>
  );
};

export default Sidebar;