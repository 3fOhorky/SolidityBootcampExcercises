import "dotenv/config";
import {
  MyFlashMinter,
  MyFlashMinter__factory,
  MyFlashSwap,
  MyFlashSwap__factory,
  MagicSwapFaucet,
  MagicSwapFaucet__factory,
} from "../../typechain-types";
import { BaseProvider } from "@ethersproject/providers";
import { Signer, utils, Wallet } from "ethers";
import { ethers } from "hardhat";

const FLASH_LOAN_FEE = 1000;
const FLASH_LOAN_AMOUNT = 10;
const flashLoanFeeString = ((FLASH_LOAN_FEE * 100) / 10000).toFixed(2) + "%";

let flashMintErc20Contract: MyFlashMinter;
let flashSwapContract: MyFlashSwap;
let magicSwapFaucetContract: MagicSwapFaucet;

async function main() {
  // Connecting to a public testnet
  // const wallet = setupWallet();
  // console.log(`Using address ${wallet.address}`);
  // const provider = setupProvider();
  // console.log(`Connected to the Provider`);
  // await checkNetwork(provider);
  // const signer = wallet.connect(provider);

  // Connecting to the VM Blockchain
  const signers = await ethers.getSigners();
  const signer = signers[0];

  await initContracts(signer);
  await checkBalances(signer);
  await makeSwap(signer);
  await checkBalances(signer);
}

function setupWallet() {
  return process.env.MNEMONIC && process.env.MNEMONIC.length > 0
    ? Wallet.fromMnemonic(process.env.MNEMONIC)
    : new Wallet(process.env.PRIVATE_KEY ?? "");
}

function setupProvider() {
  const provider = ethers.providers.getDefaultProvider("goerli");
  return provider;
}

async function checkNetwork(provider: any) {
  const network = await provider.getNetwork();
  console.log(`Network name: ${network.name}\nChain Id: ${network.chainId}`);
  const lastBlock = await provider.getBlock("latest");
  console.log(`Connected at height: ${lastBlock.number}`);
}

async function setupSigner(wallet: Wallet, provider: BaseProvider) {
  const signer = wallet.connect(provider);
  const balanceBN = await signer.getBalance();
  const balance = Number(utils.formatEther(balanceBN));
  console.log(`Wallet balance ${balance} ETH`);
  if (balance < 0.01) {
    throw new Error("Not enough ETH to pay for gas fees");
  }
  return signer;
}

async function initContracts(signer: Signer) {
  const flashMintErc20ContractFactory = new MyFlashMinter__factory(signer);
  console.log("Deploying FlashMint ERC20 Contract\n");
  flashMintErc20Contract = await flashMintErc20ContractFactory.deploy(
    "Stonks Token",
    "Stt",
    FLASH_LOAN_FEE
  );
  console.log("Awaiting confirmations\n");
  await flashMintErc20Contract.deployed();
  console.log("Completed!\n");
  console.log(`Contract deployed at ${flashMintErc20Contract.address}\n`);
  const flashSwapContractFactory = new MyFlashSwap__factory(signer);
  console.log("Deploying FlashSwap Contract\n");
  flashSwapContract = await flashSwapContractFactory.deploy(
    flashMintErc20Contract.address
  );
  console.log("Awaiting confirmations\n");
  await flashSwapContract.deployed();
  console.log("Completed!\n");
  console.log(`Contract deployed at ${flashSwapContract.address}\n`);
  const magicSwapFaucetContractFactory = new MagicSwapFaucet__factory(signer);
  console.log("Deploying Magic Swap Faucet Contract\n");
  magicSwapFaucetContract = await magicSwapFaucetContractFactory.deploy();
  console.log("Awaiting confirmations\n");
  await magicSwapFaucetContract.deployed();
  console.log("Completed!\n");
  console.log(`Contract deployed at ${magicSwapFaucetContract.address}\n`);
  console.log(
    "Minting some tokens to the Magic Swap Faucet Contract at FlashMint ERC20 Contract\n"
  );
  const mintTokensTx = await flashMintErc20Contract.mint(
    magicSwapFaucetContract.address,
    utils.parseEther((FLASH_LOAN_AMOUNT * 100).toFixed(18))
  );
  console.log("Awaiting confirmations\n");
  await mintTokensTx.wait();
  console.log("Completed!\n");
}

async function checkBalances(signer: Signer) {
  const totalSupplyBN = await flashMintErc20Contract.totalSupply();
  const swapContractBalanceBN = await flashMintErc20Contract.balanceOf(
    flashSwapContract.address
  );
  const magicSwapFaucetContractBalanceBN =
    await flashMintErc20Contract.balanceOf(magicSwapFaucetContract.address);
  const totalSupply = utils.formatEther(totalSupplyBN);
  const swapContractBalance = utils.formatEther(swapContractBalanceBN);
  const magicSwapFaucetContractBalance = utils.formatEther(
    magicSwapFaucetContractBalanceBN
  );
  console.log(`Total supply of tokens: ${totalSupply}\n`);
  console.log(
    `Current token balance inside the swap contract: ${swapContractBalance}\n`
  );
  console.log(
    `Current token balance inside the magic swap faucet contract: ${magicSwapFaucetContractBalance}\n`
  );
}

async function makeSwap(signer: Signer) {
  console.log(
    `Initiating flash swap to borrow ${FLASH_LOAN_AMOUNT} tokens trying to profit ${
      FLASH_LOAN_AMOUNT / 2
    }\n`
  );
  const swapTx = await flashSwapContract.flashBorrow(
    flashMintErc20Contract.address,
    utils.parseEther(FLASH_LOAN_AMOUNT.toFixed(18)),
    magicSwapFaucetContract.address,
    utils.parseEther((FLASH_LOAN_AMOUNT / 2).toFixed(18))
  );
  console.log("Awaiting confirmations\n");
  const receipt = await swapTx.wait();
  console.log(
    `Flash Swap completed!\n\n${
      receipt.gasUsed
    } gas units spent (${utils.formatEther(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)
    )} ETH)\nPaid ${
      (FLASH_LOAN_AMOUNT * FLASH_LOAN_FEE) / 10000
    } tokens of lending fees (${flashLoanFeeString})\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
