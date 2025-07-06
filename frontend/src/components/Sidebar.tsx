import * as React from 'react';
import {
  EuiSideNav,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login } from './Login';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, address, logout, roles } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [loginType, setLoginType] = React.useState<'admin' | 'user'>('user');

  const allNavItems = [
    {
      id: '1',
      name: 'Telemetry Dashboard',
      onClick: () => navigate('/metrics'),
      isSelected: location.pathname === '/metrics',
      icon: <EuiIcon type="dashboardApp" />,
      isAdmin: true, // This marks the item as admin-only
    },
    {
      id: 'issuer-dashboard',
      name: 'Issuer Dashboard',
      onClick: () => navigate('/issuer-dashboard'),
      isSelected: location.pathname === '/issuer-dashboard',
      icon: <EuiIcon type="user" />,
      isIssuer: true,
    },
    {
      id: '2',
      name: 'Register Certificate',
      onClick: () => navigate('/register-certificate'),
      isSelected: location.pathname === '/register-certificate',
      icon: <EuiIcon type="document" />,
      isIssuer: true,
    },
    {
      id: '3',
      name: 'My Certificates',
      onClick: () => navigate('/certificates'),
      isSelected: location.pathname === '/certificates',
      icon: <EuiIcon type="indexOpen" />,
    },
    {
      id: '4',
      name: 'Transactions',
      onClick: () => navigate('/wallet'),
      isSelected: location.pathname === '/wallet',
      icon: <EuiIcon type="currency" />,
    },
    {
      id: '5',
      name: 'Settings',
      onClick: () => navigate('/settings'),
      isSelected: location.pathname === '/settings',
      icon: <EuiIcon type="gear" />,
      isAdmin: true, // This marks the item as admin-only
    },
  ];

  const publicNavItems = [
    {
      id: 'verify-certificate',
      name: 'Verify Certificate',
      onClick: () => navigate('/verify-certificate'),
      isSelected: location.pathname === '/verify-certificate',
      icon: <EuiIcon type="checkInCircleFilled" />,
    },
  ];

  const adminLoginNavItem = {
    id: 'admin-login',
    name: 'Admin Login',
    onClick: () => navigate('/admin-login'),
    icon: <EuiIcon type="user" />,
  };

  const userLoginNavItem = {
    id: 'user-login',
    name: 'Issuer/Student Login',
    onClick: () => {
      setLoginType('user');
      setIsLoginModalOpen(true);
    },
    icon: <EuiIcon type="user" />,
  };

  const visibleItems = isAuthenticated
    ? allNavItems.filter(item => {
        const userIsAdmin = roles.includes('admin');

        if (userIsAdmin) {
          return item.isAdmin === true;
        }

        if (item.isIssuer && !roles.includes('issuer')) {
          return false;
        }

        // Hide admin-only items for non-admin users
        if (item.isAdmin) {
          return false;
        }

        return true;
      })
    : [];

  const sideNavItems = [
    {
      name: 'Blockchain Platform',
      id: 0,
      items: isAuthenticated
        ? (roles.includes('admin') ? visibleItems : [...publicNavItems, ...visibleItems])
        : [...publicNavItems, adminLoginNavItem, userLoginNavItem],
    }
  ];

  return (
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

      {/* Always show logout for any authenticated user */}
      {isAuthenticated && (
        <div style={{ position: 'absolute', bottom: '20px', width: 'calc(100% - 32px)' }}>
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="xs">
                {roles.includes('admin') ? 'Admin' : (address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '')}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton size="s" onClick={logout} fullWidth>
                Logout
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}

      <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} loginType={loginType} />
    </div>
  );
};

export default Sidebar;
