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

## 2. Frontend (React)
- Integrate MetaMask for user authentication and wallet management.
- Allow users to connect their MetaMask wallet and display their address.
- Provide UI for:
  - Viewing wallet address and balance
  - Sending transactions
  - Creating a new wallet (if not using MetaMask)
- Interact with backend API for additional wallet features.
- Display clear error/success messages for all actions.

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

