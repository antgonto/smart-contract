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

## 2. Frontend (React)
- Integrate MetaMask for user authentication and wallet management.
- Allow users to connect their MetaMask wallet and display their address.
- Provide UI for:
  - Viewing wallet address and balance
  - Sending transactions
  - Creating a new wallet (if not using MetaMask)
- Interact with backend API for additional wallet features.
- Display clear error/success messages for all actions.
- **Step-by-step to connect accounts to MetaMask:**
  1. Open MetaMask and switch to the Ganache network (RPC URL: http://localhost:8545, Chain ID: 1337).
  2. Import the private key of the desired account (from backend or wallet_addresses.txt) into MetaMask.
  3. The account will appear in MetaMask and can be used for transactions on Ganache.
- **Step-by-step to transfer funds between accounts:**
  1. In MetaMask, select the account to send from.
  2. Click "Send", enter the recipient address (another Ganache account), and specify the amount.
  3. Confirm the transaction in MetaMask.
  4. Alternatively, use a backend or Python script to send funds by signing and broadcasting the transaction using the sender's private key.

## 3. Security
- Never expose private keys to the frontend or store them in plaintext.
- Use HTTPS for all API communications.
- Validate and sanitize all user inputs.
- Implement authentication for sensitive endpoints (e.g., sending transactions).

## 4. Documentation
- Provide clear setup instructions for both backend and frontend.
- Document API endpoints and expected request/response formats.
- Include security best practices and recommendations.

## 5. Testing
- Write unit and integration tests for wallet creation and transaction endpoints.
- Test MetaMask integration and all frontend wallet features.

## 6. Optional Enhancements
- Support for multiple blockchains (modular design).
- User account system for managing multiple wallets.
- Transaction history tracking.
- Email or notification integration for wallet activity.
