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
  const [isConfirmModalVisible, setIsConfirmModalVisible] = React.useState(false);
  const showConfirmModal = () => setIsConfirmModalVisible(true);
  const closeConfirmModal = () => setIsConfirmModalVisible(false);

  const allNavItems = [
    {
      id: '1',
      name: 'Telemetry Dashboard',
      onClick: () => navigate('/'),
      isSelected: location.pathname === '/',
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
    {
      id: 'admin-dashboard',
      name: 'Admin Dashboard',
      onClick: () => navigate('/admin-dashboard'),
      isSelected: location.pathname === '/admin-dashboard',
      icon: <EuiIcon type="lock" />,
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

  const visibleItems = isAuthenticated
    ? allNavItems.filter(item => {
        if (item.isIssuer && !roles.includes('issuer')) return false;
        if (item.isAdmin && !roles.includes('admin')) return false; // Check for admin role
        return true;
      })
    : [];

  const sideNavItems = [
    {
      name: 'Blockchain Platform',
      id: 0,
      items: [
        ...publicNavItems,
        ...visibleItems,
      ],
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

      <div style={{ position: 'absolute', bottom: '20px', width: 'calc(100% - 32px)' }}>
        {isAuthenticated ? (
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="xs">
                {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ''}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton size="s" onClick={logout} fullWidth>
                Logout
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <Login />
        )}
      </div>

      {isConfirmModalVisible && (
        <div className="confirm-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '4px',
            maxWidth: '400px'
          }}>
            <p>Are you sure you want to drop the cyber_db database? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={{ marginRight: '10px', padding: '5px 10px' }}
                onClick={closeConfirmModal}
              >
                Cancel
              </button>
              <button
                style={{ padding: '5px 10px' }}
                onClick={showConfirmModal}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
