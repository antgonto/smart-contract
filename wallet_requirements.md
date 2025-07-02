# Blockchain Wallet Automation Requirements

## 1. Backend (Python, web3.py)
- Provide an API endpoint to create a new blockchain wallet (Ethereum address and private key).
- Ensure private keys are never exposed to the frontend or stored insecurely.
- Implement endpoints for:
  - Retrieving wallet address (public info only)
  - Checking wallet balance
  - Sending transactions (with proper authentication)
- Use secure key management practices (consider environment variables, encrypted storage, or external vaults).
- Integrate with web3.py for blockchain interactions.
- Return clear error messages for failed operations.
- Document all API endpoints.
- **Step-by-step to fund new accounts:**
  1. After creating a new wallet, automatically send ETH to the new address from a pre-funded Ganache account:
     - Store the private key of a pre-funded Ganache account securely in your backend (e.g., as an environment variable `GANACHE_FUNDER_PRIVATE_KEY`).
     - After wallet creation, use web3.py in your backend to send a transaction from the funder account to the new wallet address.
     - Example (Python/web3.py):
       ```python
       from web3 import Web3
       w3 = Web3(Web3.HTTPProvider("http://localhost:8545"))
       funder = w3.eth.account.from_key(GANACHE_FUNDER_PRIVATE_KEY)
       tx = {
           'nonce': w3.eth.get_transaction_count(funder.address),
           'to': new_wallet_address,
           'value': w3.to_wei(10, 'ether'),
           'gas': 21000,
           'gasPrice': w3.to_wei('50', 'gwei'),
       }
       signed_tx = funder.sign_transaction(tx)
       w3.eth.send_raw_transaction(signed_tx.rawTransaction)
       ```
     - You can add this logic to your wallet creation endpoint or as a post-processing step.
  2. Store the new wallet's address and private key securely (never expose private key to frontend).
  3. Confirm the transaction and update the balance endpoint to reflect the funded amount.

## 2. Frontend (React, MetaMask, ethers.js/web3.js)
- Integrate MetaMask to allow users to connect their Ethereum wallet.
- Display both MetaMask and backend-created wallet addresses and balances.
- Allow users to:
  - Initiate transfers from MetaMask to backend-created wallets (using MetaMask for signing).
  - Initiate transfers from backend-created wallets to MetaMask (using backend API for signing).
- Use backend API endpoints for backend wallet actions, and MetaMask for user wallet actions.
- Never expose backend private keys to the frontend.
- Example flow:
  1. User connects MetaMask and sees their address and balance.
  2. User requests a new backend wallet (API creates and prefunds it).
  3. User can transfer ETH from MetaMask to backend wallet (MetaMask signs and sends).
  4. User can transfer ETH from backend wallet to MetaMask (backend signs and sends via API).
  5. User can fetch and display balances for both wallets.

## 3. API Endpoints Checklist
- `POST /wallet/create` — Creates and prefunds a new wallet (backend only, never exposes private key).
- `GET /wallet/balance/{address}` — Returns ETH balance for any address.
- `POST /wallet/send` — Sends ETH from a backend wallet to another address (backend signs and sends).
- (Frontend) Use MetaMask to send ETH from user wallet.

## 4. Security & Best Practices
- Never expose backend private keys to the frontend or store them insecurely.
- Only allow the backend to sign transactions for backend-controlled wallets.
- Use environment variables or secure vaults for private key management.
- Return clear error messages for failed operations.
- Document all API endpoints and frontend flows.

## 5. Example User Flow
1. User connects MetaMask in the frontend.
2. User requests a new backend wallet (API creates and prefunds it).
3. User sees both addresses and balances.
4. User can transfer ETH between MetaMask and backend wallet in both directions.
5. User can fetch and display balances for both wallets at any time.

## 6. Security
- Never expose private keys to the frontend or store them in plaintext.
- Use HTTPS for all API communications.
- Validate and sanitize all user inputs.
- Implement authentication for sensitive endpoints (e.g., sending transactions).

## 7. Documentation
- Provide clear setup instructions for both backend and frontend.
- Document API endpoints and expected request/response formats.
- Include security best practices and recommendations.

## 8. Testing
- Write unit and integration tests for wallet creation and transaction endpoints.
- Test MetaMask integration and all frontend wallet features.

## 9. Optional Enhancements
- Support for multiple blockchains (modular design).
- User account system for managing multiple wallets.
- Transaction history tracking.
- Email or notification integration for wallet activity.
