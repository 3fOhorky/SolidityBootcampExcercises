import { ethers } from "hardhat";
import { MyERC20Votes__factory, TokenizedBallot__factory } from "../typechain-types";

const MINT_VALUE = ethers.utils.parseUnits("10");
const TRANSFER_VALUE = ethers.utils.parseUnits("2");

async function main() {
    const [deployer, acc1, acc2, acc3] = await ethers.getSigners();
    //Creating TokenContract
    const tokenContractFactory = new MyERC20Votes__factory(deployer);
    //Deploying Token Contract
    const tokenContract = await tokenContractFactory.deploy();
    const tokenContractReceipt = await tokenContract.deployTransaction.wait();
    console.log(`\nThe tokenContract address is ${tokenContract.address} \nand the transaction receipt is $ {tokenContractReceipt} \n`)
    
    const tokenizedBallotFactory = new TokenizedBallot__factory(deployer);

    const proposals = process.argv.slice(2);
    console.log("Deploying Tokenized Ballot contract\n"); 
    console.log("Proposals: ");
    proposals.forEach((element, index) => {
        console.log(`Proposal N. ${index + 1}: ${element}`);
    });
    
    //Minting Tokens
    const mintTX = await tokenContract.mint(acc1.address, MINT_VALUE);
    const mintTxReceipt = await mintTX.wait();

    console.log(`\nAccount 1 ${acc1.address} has minted tokens, \nand the receipt hash is ${mintTxReceipt.transactionHash}`);

    const balanceBN = await tokenContract.balanceOf(acc1.address);
    console.log(`Account1 has a balance of ${ethers.utils.formatUnits (balanceBN)}`);

    //Delegating Tokens
    const delegateTXAcc1 = await tokenContract.connect(acc1).delegate(acc1.address); 
    await delegateTXAcc1.wait();

    const delegatedVotesAfterAcc1 = await tokenContract.getVotes(acc1.address);
    console.log(`After delegating votes account ${acc1.address} has ${ethers.utils.formatUnits(delegatedVotesAfterAcc1)} \n`);

    const targetBlockNumber = await ethers.provider.getBlockNumber();

    const tokenizedBallot = await tokenizedBallotFactory.deploy(
        proposals.map(ethers.utils.formatBytes32String),
        tokenContract.address,
        targetBlockNumber
    );

    const tokenizedBallotReceipt = await tokenizedBallot.deployTransaction.wait();
    console.log(`The address for the Token Ballot contract is ${tokenizedBallot.address} \nand the transaction receipt is ${tokenizedBallotReceipt}\n`);
    console.log(`\nBlock Number ${targetBlockNumber} \n`);

    const voteAcc1 = await tokenizedBallot.connect(acc1).vote(1,1);
    await voteAcc1.wait();

    const votingPowerAcc1 = await tokenizedBallot.votingPower(acc1.address); 
    console.log(`Voting power for Account 1 is ${votingPowerAcc1}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});