const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const EncryptedPredictionMarket = await ethers.getContractFactory("EncryptedPredictionMarket");
  const contract = await EncryptedPredictionMarket.deploy();

  await contract.deployed();

  console.log("EncryptedPredictionMarket deployed to:", contract.address);
  console.log("Contract ABI available in artifacts/contracts/EncryptedPredictionMarket.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });