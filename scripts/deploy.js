// scripts/deploy.js
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const CertificateRegistry = await ethers.getContractFactory('CertificateRegistry');
  const contract = await CertificateRegistry.deploy();
  await contract.deployed();

  console.log('CertificateRegistry deployed to:', contract.address);

  // Write the contract address to a file for backend use
  const contractsDir = path.resolve(__dirname, '../contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  fs.writeFileSync(
    path.join(contractsDir, 'CertificateRegistry.txt'),
    contract.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

