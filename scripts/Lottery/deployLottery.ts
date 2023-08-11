import { ethers, Contract } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as LotteryJSON from "../../artifacts/contracts/Lottery/Lottery.sol/Lottery.json";
import {
  getSigner,
  checkBalance,
} from "../../helpers/utils";
import { Lottery } from "../../typechain-types";

// deploy with args ETH fee extracted from each buy-in (suggest no more than 10-20% of lowest buy-in or .001 )
async function main() {
  const signer = getSigner();
  if (!checkBalance(signer)) {
    return;
  }
    
  // Now deploy LotteryToken 
  console.log("Deploying Lottery contract");
  const lotteryFactory = new ethers.ContractFactory(
    LotteryJSON.abi,
    LotteryJSON.bytecode,
    signer
  );

  const BET_PRICE = 1;
  const BET_FEE = 0.2;
  const TOKEN_RATIO = 1;

  const LotteryContract = await lotteryFactory.deploy(
    "Lottery Token",
    "LTK10",
    TOKEN_RATIO,
    ethers.utils.parseEther(BET_PRICE.toFixed(18)),
    ethers.utils.parseEther(BET_FEE.toFixed(18))
  ) as Lottery;

  console.log("Awaiting confirmation on Lottery deployment");
  await LotteryContract.deployed();
  console.log("Completed Lottery deployment");
  console.log(`Lottery contract deployed at ${LotteryContract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
