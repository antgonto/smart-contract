import React, { createContext, useContext, useState, ReactNode } from 'react';
import { fetchAccountRoles } from '../services/accountRoleService';

interface AccountRoleContextType {
  accountRoles: Record<string, string[]>;
  getAccountRoles: (address: string) => Promise<string[]>;
}

const AccountRoleContext = createContext<AccountRoleContextType | undefined>(undefined);

export const AccountRoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accountRoles, setAccountRoles] = useState<Record<string, string[]>>({});

  const getAccountRoles = async (address: string) => {
    if (accountRoles[address]) return accountRoles[address];
    const roles = await fetchAccountRoles(address);
    setAccountRoles(prev => ({ ...prev, [address]: roles }));
    return roles;
  };

  return (
    <AccountRoleContext.Provider value={{ accountRoles, getAccountRoles }}>
      {children}
    </AccountRoleContext.Provider>
  );
};

export const useAccountRole = () => {
  const ctx = useContext(AccountRoleContext);
  if (!ctx) throw new Error('useAccountRole must be used within AccountRoleProvider');
  return ctx;
};

