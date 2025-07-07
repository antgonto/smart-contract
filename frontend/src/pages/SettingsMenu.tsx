import React, { useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import axios from "axios";

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const actions = [
    {
      id: 'compile-contracts',
      title: 'Compile Contracts',
      url: '/app/v1/smartcontracts/smartcontract/compile/',
      successMsg: 'Success: the contracts were successfully compiled.',
      errorMsg: 'Failed to compile the contracts: ',
      iconType: 'indexRuntime',
    },
    {
      id: 'deploy-contracts',
      title: 'Deploy Contracts',
      url: '/app/v1/smartcontracts/smartcontract/deploy/',
      successMsg: 'Success: the contracts were successfully deployed.',
      errorMsg: 'Failed to to deploy the contracts: ',
      iconType: 'launch',
    },
];

// 5 columns x 4 rows = 20 tiles total
const GRID_SIZE = 3 * 4;

const SettingsMenu: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAction = async (action: typeof actions[0]) => {
    if (action.id === 'connect-metamask') {
      setError('');
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
          setAddress(accounts[0]);
          alert(action.successMsg);
          setSelected(prev =>
            prev.includes(action.id)
              ? prev.filter(id => id !== action.id)
              : [...prev, action.id]
          );
        } catch (err: any) {
          setError('MetaMask connection failed');
          alert(action.errorMsg + err?.message || 'Unknown error');
        }
      } else {
        setError('MetaMask not detected');
        alert('MetaMask not detected');
      }
      return;
    }
    try {
      console.log("url", action.url);
      const response = await api.post(action.url);
      const data = response.data;
      alert(data.detail || action.successMsg);
      setSelected(prev =>
        prev.includes(action.id)
          ? prev.filter(id => id !== action.id)
          : [...prev, action.id]
      );
    } catch (error) {
      alert(action.errorMsg + error);
    }
  };

  const blankCount = GRID_SIZE - actions.length;

  return (
    <>
      <EuiSpacer size="xl" />
      {address && (
        <EuiCallOut title="MetaMask Connected" color="success" iconType="check">
          <p>Address: {address}</p>
        </EuiCallOut>
      )}
      {error && (
        <EuiCallOut title="Error" color="danger" iconType="alert">
          <p>{error}</p>
        </EuiCallOut>
      )}
      <EuiSpacer size="xl" />
      <EuiFlexGrid columns={4} gutterSize="l">
        {actions.map(action => (
          <EuiFlexItem key={action.id} style={{ minHeight: 150 }}>
            <EuiCard
              icon={<EuiIcon type={action.iconType} size="xxl" />}
              title={action.title}
              textAlign="center"
              paddingSize="l"
              selectable={{
                isSelected: selected.includes(action.id),
                onClick: () => handleAction(action),
              }}
            />
          </EuiFlexItem>
        ))}
        {Array.from({ length: blankCount }).map((_, idx) => (
          <EuiFlexItem key={`blank-${idx}`} style={{ minHeight: 150 }}>
            {/* empty space */}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

export default SettingsMenu;
