import { ethers } from "hardhat";
import { expect } from "chai";
import { Lottery } from "../typechain-types";
import { LotteryToken } from "../typechain-types";
import { Signer } from "ethers";

describe("Lottery", () => {
    let lottery: Lottery;
    let token: LotteryToken;
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;

    const name = "LotteryToken";
    const symbol = "LTK";
    const purchaseRatio = 10;
    const betPrice = 5;
    const betFee = 1;

    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();

        const lotteryFactory = await ethers.getContractFactory("Lottery", owner);
        lottery = (await lotteryFactory.deploy(
            name,
            symbol,
            purchaseRatio,
            betPrice,
            betFee
        )) as Lottery;
        await lottery.deployed();

        const tokenAddress = await lottery.paymentToken();
        token = (await ethers.getContractAt("LotteryToken", tokenAddress)) as LotteryToken;
    });

    it("Should deploy Lottery and LotteryToken contracts correctly", async () => {
        expect(await token.name()).to.equal(name);
        expect(await token.symbol()).to.equal(symbol);
    });
    
    it("should allow owner to open bets", async () => {
        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        await lottery.openBets(currentTime + 3600);  // 1 hour in the future
        expect(await lottery.betsOpen()).to.be.true;
    });

    it("should allow users to purchase tokens", async () => {
        const purchaseValue = ethers.utils.parseEther("1");
        await lottery.purchaseTokens({ value: purchaseValue });
        expect(await token.balanceOf(await owner.getAddress())).to.equal(purchaseValue.mul(purchaseRatio));
    });

    it("should allow users to place bets when bets are open", async () => {
        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        await lottery.openBets(currentTime + 3600);  // 1 hour in the future
    
        const betAmount = betPrice + betFee;
    
        const purchaseValue = ethers.utils.parseEther("1");
        await lottery.connect(user1).purchaseTokens({ value: purchaseValue });

        // First, approve the Lottery contract to spend tokens on behalf of the user
        await token.connect(user1).approve(lottery.address, ethers.utils.parseEther(betAmount.toString()));
    
        // Now, place the bet
        await lottery.connect(user1).bet();
    
        expect(await token.balanceOf(lottery.address)).to.equal(betAmount);
    });

    it("should not allow users to place bets when bets are closed", async () => {
        await expect(lottery.bet()).to.be.revertedWith("Lottery is closed");
    });

    it("should allow users to close the lottery after the closing time", async () => {
        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        await lottery.openBets(currentTime + 10);
        await new Promise(r => setTimeout(r, 11000));  // Wait for 11 seconds
        await lottery.closeLottery();
        expect(await lottery.betsOpen()).to.be.false;
    });
});
