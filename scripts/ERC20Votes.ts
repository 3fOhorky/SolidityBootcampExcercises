import { ethers } from "hardhat";
import { MyERC20Votes__factory } from "../typechain-types";

const MINT_VALUE = ethers.utils.parseUnits("10");
const TRANSFER_VALUE = ethers.utils.parseUnits("2");

async function main() {
    const [deployer, acc1, acc2, acc3] = await ethers.getSigners();
    const contractFactory = new MyERC20Votes__factory(deployer);
    const contract = await contractFactory.deploy();
    const receipt = await contract.deployTransaction.wait();
    console.log(`The contract was deployed at address ${contract.address} 
        at block ${receipt.blockNumber}`);
    const mintTx = await contract.mint(acc1.address, MINT_VALUE);
    const mintTxReceipt = await mintTx.wait();
    console.log(`Minted ${ethers.utils.formatUnits(MINT_VALUE)} to the
        address ${acc1.address} at block ${receipt.blockNumber}`);

    const balanceBigNumber = await contract.balanceOf(acc1.address);
    console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(balanceBigNumber)}
        MyTokens`);
        
    const votes = await contract.getVotes(acc1.address);
    console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(votes)}
        voting power before self delegating`);
        
    // const delegateTx = await contract.connect(acc1).delegate(acc2.address);
    // await delegateTx.wait();
    
    const delegateTx = await contract.connect(acc1).delegate(acc1.address);
    await delegateTx.wait();
    
    const votesAcc1 = await contract.getVotes(acc1.address);
    console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(votesAcc1)}
        voting power after self delegating`);

    // const votesAcc1After = await contract.getVotes(acc1.address);
    // const votesAcc2After = await contract.getVotes(acc2.address);
    // console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(votesAcc1After)}
    //     voting power after delegating`);
    // console.log(`Account ${acc2.address} has ${ethers.utils.formatUnits(votesAcc2After)}
    //     voting power after delegating`);
        
    const transferTx = await contract.connect(acc1).transfer(acc3.address, TRANSFER_VALUE);
    await transferTx.wait();
    
    const votesAcc3Before = await contract.getVotes(acc3.address);
    console.log(`Account ${acc3.address} has ${ethers.utils.formatUnits(votesAcc3Before)}
        voting power before self delegating`);
        
    const delegateAcc3Tx = await contract.connect(acc3).delegate(acc3.address);
    await delegateAcc3Tx.wait();
    
    const votesAcc3After = await contract.getVotes(acc3.address);
    console.log(`Account ${acc3.address} has ${ethers.utils.formatUnits(votesAcc3After)}
        voting power after self delegating`);
        
    const votesAcc1AfterTransfer = await contract.getVotes(acc1.address);
    console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(votesAcc1AfterTransfer)}
        voting power.`);
        
    const mint2Tx = await contract.mint(acc1.address, MINT_VALUE);
    const mint2TxReceipt = await mintTx.wait();
    
    const votesAcc1AfterMint2 = await contract.getVotes(acc1.address);
    console.log(`Account ${acc1.address} has ${ethers.utils.formatUnits(votesAcc1AfterMint2)}
        voting power before self delegating`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});