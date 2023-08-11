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
    
  console.log("Attaching LiquiBet contract");
  const LotteryFactory = new ethers.ContractFactory(
    LotteryJSON.abi,
    LotteryJSON.bytecode,
    signer
  );

  const lotteryContract = LotteryFactory.attach("0x7c86806587B62BF65d04567932A01922B7C418b1") as Lottery;

  console.log("Closing lottery");
  await lotteryContract.closeLottery();

  console.log(`Lottery successfully closed!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
