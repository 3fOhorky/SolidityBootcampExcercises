import { ethers, Contract } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as LotteryTokenJSON from "../../artifacts/contracts/Lottery/LotteryToken.sol/LotteryToken.json";
import {
  getSigner,
  checkBalance,
} from "../../helpers/utils";
import { LotteryToken } from "../../typechain-types";

// deploy with args ETH fee extracted from each buy-in (suggest no more than 10-20% of lowest buy-in or .001 )
async function main() {
  const signer = getSigner();
  if (!checkBalance(signer)) {
    return;
  }
    
  // Now deploy LotteryToken 
  console.log("Deploying LotteryToken contract");
  const lotteryTokenFactory = new ethers.ContractFactory(
    LotteryTokenJSON.abi,
    LotteryTokenJSON.bytecode,
    signer
  );

  const LotteryTokenContract = await lotteryTokenFactory.deploy(
    "Lottery Token",
    "LTK10"
  ) as LotteryToken;

  console.log("Awaiting confirmation on LotteryToken deployment");
  await LotteryTokenContract.deployed();
  console.log("Completed LotteryToken deployment");
  console.log(`LotteryToken contract deployed at ${LotteryTokenContract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
