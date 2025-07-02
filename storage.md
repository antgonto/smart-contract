# Storage Options for PDF Certificates

This document describes the requirements and implementation details for supporting both on-chain and off-chain storage of PDF certificates in the system.

## 1. Storage Option Selector
- A selector (dropdown/toggle) is provided in `SettingsMenu.tsx` to allow users to choose between:
  - Storing PDF certificates **on-chain**
  - Storing PDF certificates **off-chain**
- The selected option is persisted (e.g., in React context, Redux, or localStorage) for use by other components.

## 2. Conditional UI Rendering
- Only the relevant `RegisterCertificate.tsx` view is shown based on the selected storage option.
- Any unrelated information in `Dashboard.tsx` is hidden depending on the chosen option.

## 3. Smart Contract Support
- The smart contract is updated to support:
  - Storing the full PDF data on-chain (as bytes or string)
  - Storing only a reference (e.g., IPFS hash) off-chain
- Contract functions are provided for both registration methods.
- The contract can distinguish between on-chain and off-chain certificates.

## 4. Backend Adaptation
- Backend endpoints accept a parameter/flag indicating the storage option.
- For on-chain: the backend sends the full PDF data to the contract.
- For off-chain: the backend uploads the PDF to IPFS (or other storage) and sends only the reference/hash to the contract.
- The backend logic matches the user's selection from the frontend and returns appropriate responses.

## Summary Table

| Area                | Requirement                                                                 |
|---------------------|------------------------------------------------------------------------------|
| Frontend: Settings  | Selector for on-chain/off-chain in SettingsMenu.tsx                          |
| Frontend: Register  | Show only the relevant RegisterCertificate.tsx view based on selection       |
| Frontend: Dashboard | Hide unrelated info in Dashboard.tsx based on selection                      |
| Smart Contract      | Support both on-chain and off-chain PDF storage and registration             |
| Backend             | Respond to storage option, handle PDF accordingly, and return correct result |

