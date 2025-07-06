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
  const { isAuthenticated, address, logout, roles: contextRoles } = useAuth();
  // Memoize roles to avoid unnecessary re-renders and fix react-hooks/exhaustive-deps warning
  const roles = React.useMemo(() => contextRoles || [], [contextRoles]);
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
    id: 'admin-dashboard',
    name: 'Admin Login',
    onClick: () => {
      navigate('/admin-dashboard');
      // After successful login, redirect to root
      // This requires handling in the login logic/modal, not just here
    },
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

  // Add logout nav item for authenticated users
  const logoutNavItem = {
    id: 'logout',
    name: 'Logout',
    icon: <EuiIcon type="exit" />,
    onClick: () => {
      logout();
      navigate('/');
    },
    isSelected: false,
  };

  // Show user/address label above nav
  const userLabel = (
    <EuiText size="xs" style={{ marginBottom: 12, textAlign: 'center' }}>
      {roles.includes('admin')
        ? 'Admin'
        : address
        ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
        : ''}
    </EuiText>
  );

  // Show role label at the very top of the sidebar
  const roleLabel = isAuthenticated && roles.length > 0
    ? (roles.includes('admin') ? 'Admin' : roles.includes('issuer') ? 'Issuer' : 'Student')
    : '';

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
        return !item.isAdmin;
      })
    : [];

  // Add logout item for authenticated users
  const navItemsWithLogout = isAuthenticated ? [...visibleItems, logoutNavItem] : [];

  const sideNavItems = [
    {
      name: 'Blockchain Platform',
      id: 0,
      items: isAuthenticated
        ? navItemsWithLogout
        : [...publicNavItems, adminLoginNavItem, userLoginNavItem],
    }
  ];

  React.useEffect(() => {
    if (isAuthenticated && roles && roles.length > 0) {
      const roleLabel = roles.includes('admin')
        ? 'Admin'
        : roles.includes('issuer')
        ? 'Issuer'
        : 'Student';
      alert(`Logged in as: ${roleLabel}`);
    }
  }, [isAuthenticated, roles]);

  return (
    <div style={{ width: '200px', height: '100%', background: '#1a1c21', padding: '16px' }}>
      {/* Role label at the top */}
      {isAuthenticated && roleLabel && (
        <EuiText size="s" style={{ marginBottom: 16, textAlign: 'center', fontWeight: 'bold', color: '#FFD700' }}>
          {roleLabel}
        </EuiText>
      )}
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
      {isAuthenticated && userLabel}
      <EuiSideNav items={sideNavItems} />

      <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} loginType={loginType} />
    </div>
  );
};

export default Sidebar;
