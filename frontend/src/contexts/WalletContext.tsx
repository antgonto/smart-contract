import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface WalletAccount {
  name: string;
  address: string;
  privateKey?: string;
  mnemonic?: string;
}

interface WalletContextType {
  accounts: WalletAccount[];
  setAccounts: (accounts: WalletAccount[]) => void;
  selectedAccountIdx: number;
  setSelectedAccountIdx: (idx: number) => void;
  selectedAccount: WalletAccount | null;
}

const WalletContext = createContext<WalletContextType>({
  accounts: [],
  setAccounts: () => {},
  selectedAccountIdx: 0,
  setSelectedAccountIdx: () => {},
  selectedAccount: null,
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Load from localStorage
  const getInitialAccounts = () => {
    try {
      const data = localStorage.getItem('wallet_accounts');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  const getInitialSelectedIdx = () => {
    try {
      const idx = localStorage.getItem('wallet_selected_idx');
      return idx ? Number(idx) : 0;
    } catch {
      return 0;
    }
  };
  const [accounts, setAccountsState] = useState<WalletAccount[]>(getInitialAccounts());
  const [selectedAccountIdx, setSelectedAccountIdxState] = useState<number>(getInitialSelectedIdx());
  const selectedAccount = accounts[selectedAccountIdx] || null;

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('wallet_accounts', JSON.stringify(accounts));
  }, [accounts]);
  useEffect(() => {
    localStorage.setItem('wallet_selected_idx', String(selectedAccountIdx));
  }, [selectedAccountIdx]);

  // Wrapped setters to keep API the same
  const setAccounts = (accs: WalletAccount[]) => {
    setAccountsState(accs);
    // If selected index is out of bounds, reset to 0
    if (selectedAccountIdx >= accs.length) {
      setSelectedAccountIdxState(0);
    }
  };
  const setSelectedAccountIdx = (idx: number) => {
    setSelectedAccountIdxState(idx);
  };

  return (
    <WalletContext.Provider value={{ accounts, setAccounts, selectedAccountIdx, setSelectedAccountIdx, selectedAccount }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
