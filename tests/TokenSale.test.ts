import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
  MyERC20Token,
  MyERC20Token__factory,
  MyERC721Token,
  MyERC721Token__factory,
  TokenSale,
  TokenSale__factory,
} from "../typechain-types";

const TEST_RATIO = 5;
const NFT_PRICE = ethers.utils.parseEther("0.1");
const TOKENS_BUY_VALUE = ethers.utils.parseEther("1");

describe("NFT Shop", async () => {
  let accounts: SignerWithAddress[];
  let tokenSaleContract: TokenSale;
  let paymentTokenContract: MyERC20Token;
  let nftContract: MyERC721Token;
  let erc20ContractFactory: MyERC20Token__factory;
  let erc721ContractFactory: MyERC721Token__factory;
  let tokenSaleContractFactory: TokenSale__factory;
  
  async function calculateGasCosts(receipt: any) {
    return receipt.gasUsed.mul(receipt.effectiveGasPrice);
  }

  beforeEach(async () => {
    [
      accounts,
      erc20ContractFactory,
      erc721ContractFactory,
      tokenSaleContractFactory,
    ] = await Promise.all([
      ethers.getSigners(),
      ethers.getContractFactory("MyERC20Token"),
      ethers.getContractFactory("MyERC721Token"),
      ethers.getContractFactory("TokenSale"),
    ]);
    paymentTokenContract = await erc20ContractFactory.deploy();
    await paymentTokenContract.deployed();
    nftContract = await erc721ContractFactory.deploy();
    await nftContract.deployed();
    tokenSaleContract = await tokenSaleContractFactory.deploy(
      TEST_RATIO,
      NFT_PRICE,
      paymentTokenContract.address,
      nftContract.address
    );
    await tokenSaleContract.deployed();
    const MINTER_ROLE = await paymentTokenContract.MINTER_ROLE(); 
    const roleTX = await paymentTokenContract.grantRole(
      MINTER_ROLE,
      tokenSaleContract.address
    );
    await roleTX.wait();
    const roleTX2 = await nftContract.grantRole(
      MINTER_ROLE,
      tokenSaleContract.address
    );
    await roleTX2.wait();
  });

  describe("When the Shop contract is deployed", async () => {
    it("defines the ratio as provided in parameters", async () => {
      const ratio = await tokenSaleContract.ratio();
      expect(ratio).to.eq(TEST_RATIO);
    });

    it("uses a valid ERC20 as payment token", async () => {
      const paymentAddress = await tokenSaleContract.paymentToken();
      const paymentContract = erc20ContractFactory.attach(paymentAddress);
      await expect(paymentContract.balanceOf(accounts[0].address)).not.to.be
        .reverted;
      await expect(paymentContract.totalSupply()).not.to.be.reverted;
    });
  });

  describe("When a user purchases an ERC20 from the Token contract", async () => {
    let ethBalanceBefore: BigNumber;
    let gasCosts: BigNumber;

    beforeEach(async () => {
      ethBalanceBefore = await accounts[1].getBalance();
      const tx = await tokenSaleContract
        .connect(accounts[1])
        .buyTokens({ value: TOKENS_BUY_VALUE });
      const txReceipt = await tx.wait();
      const gasUsed = txReceipt.gasUsed;
      const pricePerGas = txReceipt.effectiveGasPrice;
      gasCosts = gasUsed.mul(pricePerGas);
    });

    it("charges the correct amount of ETH", async () => {
      const ethBalanceAfter = await accounts[1].getBalance();
      const diff = ethBalanceBefore.sub(ethBalanceAfter);
      const expectDiff = TOKENS_BUY_VALUE.add(gasCosts);
      const error = diff.sub(expectDiff);
      expect(error).to.eq(0);
    });

    it("gives the correct amount of tokens", async () => {
      const tokenBalance = await paymentTokenContract.balanceOf(
        accounts[1].address
      );
      const expectedBalance = TOKENS_BUY_VALUE.div(TEST_RATIO);
      expect(tokenBalance).to.eq(expectedBalance);
    });

    describe("When a user burns an ERC20 at the Token contract", async () => {
      let ethBalanceBeforeBurn: BigNumber;
      let burnGasTotalCosts: BigNumber;

      beforeEach(async () => {
        ethBalanceBeforeBurn = await accounts[1].getBalance();
        const expectedBalance = TOKENS_BUY_VALUE.div(TEST_RATIO);
        const allowTx = await paymentTokenContract
          .connect(accounts[1])
          .approve(tokenSaleContract.address, expectedBalance);
        await allowTx.wait();
        const allowTxReceipt = await allowTx.wait();

        const burnTx = await tokenSaleContract
          .connect(accounts[1])
          .returnTokens(expectedBalance);
        const burnTxReceipt = await burnTx.wait();

        const burnTxGasCosts = await calculateGasCosts(burnTxReceipt);
        const allowTxGasCosts = await calculateGasCosts(allowTxReceipt);
        burnGasTotalCosts = burnTxGasCosts.add(allowTxGasCosts);
      });
      
      it("gives the correct amount of ETH", async () => {
        const ethBalanceAfter = await accounts[1].getBalance();
        const expectedBalanceAfterBurn = ethBalanceBeforeBurn.add(TOKENS_BUY_VALUE).sub(burnGasTotalCosts);
        expect(ethBalanceAfter).to.eq(expectedBalanceAfterBurn);
    });

      it("burns the correct amount of tokens", async () => {
        const balanceAfterBurn = await paymentTokenContract.balanceOf(
          accounts[1].address
        );
        expect(balanceAfterBurn).to.eq(0);
      });
    });
  });
  
  describe("When a user purchases a NFT from the Shop contract", async () => {
    let ethBalanceBefore: BigNumber;
    let gasCosts: BigNumber;

    beforeEach(async () => {
      ethBalanceBefore = await accounts[1].getBalance();
      const allowTx = await paymentTokenContract
        .connect(accounts[1])
        .approve(tokenSaleContract.address, NFT_PRICE);
      await allowTx.wait();
      const allowTxReceipt = await allowTx.wait();
      
      const buyTx = await tokenSaleContract
        .connect(accounts[1])
        .buyTokens({ value: TOKENS_BUY_VALUE });
      const buyTxReceipt =  await buyTx.wait();

      const mintTx = await tokenSaleContract.connect(accounts[1]).buyNFT(0);
      const mintTxReceipt = await mintTx.wait();
      
      const allowTxGasCosts = await calculateGasCosts(allowTxReceipt);
      const buyTxGasCosts = await calculateGasCosts(buyTxReceipt);
      const mintTxGasCosts = await calculateGasCosts(mintTxReceipt);
      gasCosts = mintTxGasCosts.add(allowTxGasCosts).add(buyTxGasCosts);
    });
    
    it("charges the correct amount of ETH", async () => {
      const ethBalanceAfter = await accounts[1].getBalance();
      const expectedEthBalance = ethBalanceBefore.sub(TOKENS_BUY_VALUE.add(gasCosts));
      expect(ethBalanceAfter).to.eq(expectedEthBalance);
    });

    it("gives the correct NFT", async () => {
      const nftOwner = await nftContract.ownerOf(0);
      expect(nftOwner).to.eq(accounts[1].address);
    });
  });

  describe("When a user burns their NFT at the Shop contract", async () => {
    
    beforeEach(async () => {
      const tx = await tokenSaleContract.connect(accounts[1]).buyTokens({ value: TOKENS_BUY_VALUE });
      await tx.wait();
      
      const allowTx = await paymentTokenContract.connect(accounts[1]).approve(tokenSaleContract.address, NFT_PRICE);
      await allowTx.wait();

      const mintTx = await tokenSaleContract.connect(accounts[1]).buyNFT(1);
      await mintTx.wait();

      const approveTx = await nftContract.connect(accounts[1]).approve(tokenSaleContract.address, 1);
      await approveTx.wait();
      
      const burnTx = await tokenSaleContract.connect(accounts[1]).returnNFT(1);
      await burnTx.wait();
    });

    it("gives the correct amount of ERC20 tokens", async () => {
      const tokenBalanceAfter = await paymentTokenContract.balanceOf(accounts[1].address);
      const expectedTokenBalance = TOKENS_BUY_VALUE.div(TEST_RATIO).sub(NFT_PRICE.div(2));
      expect(tokenBalanceAfter).to.eq(expectedTokenBalance);
    });    
  });

  describe("When the owner withdraws from the Shop contract", async () => {
    const withdrawAmount = NFT_PRICE.div(2);

    beforeEach(async () => {
      const tx = await tokenSaleContract.connect(accounts[1]).buyTokens({ value: TOKENS_BUY_VALUE });
      await tx.wait();
  
      const allowTx = await paymentTokenContract.connect(accounts[1]).approve(tokenSaleContract.address, NFT_PRICE);
      await allowTx.wait();
  
      const mintTx = await tokenSaleContract.connect(accounts[1]).buyNFT(1);
      await mintTx.wait();
    });
  
    it("recovers the right amount of ERC20 tokens", async () => {
      const ownerAddress = await tokenSaleContract.owner();
      const ownerBefore = await paymentTokenContract.balanceOf(ownerAddress);
      const withdrawTx = await tokenSaleContract.withdraw(withdrawAmount);
      await withdrawTx.wait();

      const ownerAfter = await paymentTokenContract.balanceOf(ownerAddress);
      expect(ownerAfter.sub(ownerBefore)).to.eq(withdrawAmount);
    });
  
    it("updates the owner pool account correctly", async () => {
      const initialWithdrawable = await tokenSaleContract.withdrawableAmount();
      await tokenSaleContract.withdraw(withdrawAmount);
      const finalWithdrawable = await tokenSaleContract.withdrawableAmount();
      expect(finalWithdrawable).to.eq(initialWithdrawable.sub(withdrawAmount));
    });
  });
});
