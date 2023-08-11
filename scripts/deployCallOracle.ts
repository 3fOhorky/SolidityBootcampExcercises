import { ethers } from "hardhat";
import { MyERC20Votes__factory } from "../typechain-types";

const MINT_VALUE = ethers.utils.parseUnits("10");
const TRANSFER_VALUE = ethers.utils.parseUnits("2");

function setupProvider() {
    return new ethers.providers.AlchemyProvider("maticum", process.env.ALCHEMY_API_KEY);
}

async function main() {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? '');
    const provider = setupProvider();
    const signer = wallet.connect(provider);
    const balanceBN = 

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
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});