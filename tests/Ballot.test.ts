import { expect } from "chai";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { convertStringArrayToBytes32 } from "../helpers/utils";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];
const ERR_ALREADY_VOTED = "The voter already voted.";
const ERR_RIGHT_TO_VOTE = "The voter already has right to vote.";
const ERR_ONLY_CHAIR = "Only chairperson can give right to vote.";
const ERR_NO_RIGHT_TO_VOTE = "Has no right to vote.";

describe("Ballot", function () {
  let ballotContract: Ballot;
  let deployer: SignerWithAddress, 
      user1: SignerWithAddress, 
      user2: SignerWithAddress, 
      user3: SignerWithAddress, 
      user4: SignerWithAddress, 
      user5: SignerWithAddress;

  beforeEach(async function () {
    const ballotFactory = await ethers.getContractFactory("Ballot");
    [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();
    ballotContract = await ballotFactory
      .connect(deployer)
      .deploy(convertStringArrayToBytes32(PROPOSALS));
    await ballotContract.deployed();
  });

  const giveRightToVote = async (from: SignerWithAddress, to: SignerWithAddress) => {
    await ballotContract.connect(from).giveRightToVote(to.address);
  }

  const castVote = async (from: SignerWithAddress, proposalIndex: number) => {
    await ballotContract.connect(from).vote(proposalIndex);
  }

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async () => {
      for (let i = 0; i < PROPOSALS.length; i++) {
        const proposal = await ballotContract.proposals(i);
        expect(proposal.voteCount).to.equal(0);
      }
    });
    it("sets the deployer address as chairperson", async () => {
      const chairperson = await ballotContract.chairperson();
      expect(chairperson).to.equal(deployer.address);
    });
    it("sets the voting weight for the chairperson as 1", async () => {
      const initialWeight = await ballotContract.voters(deployer.address);
      expect(initialWeight.weight).to.equal(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async () => {
      await giveRightToVote(deployer, user1);
      const user1Weight = await ballotContract.voters(user1.address);
      expect(user1Weight.weight).to.equal(1);
    });
    it("cannot give right to vote for someone that has voted", async () => {
      await giveRightToVote(deployer, user1);
      await castVote(user1, 0);
      await expect(
        ballotContract.connect(deployer).giveRightToVote(user1.address)
      ).to.be.revertedWith(ERR_ALREADY_VOTED);
    });
    it("cannot give right to vote for someone that has already been given right to vote", async () => {
      await giveRightToVote(deployer, user1);
      await expect(
        ballotContract.connect(deployer).giveRightToVote(user1.address)
      ).to.be.revertedWith(ERR_RIGHT_TO_VOTE);
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    it("should register the vote", async () => {
      await giveRightToVote(deployer, user1);
      await castVote(user1, 0);
      const proposal = await ballotContract.winningProposal();
      expect(proposal).to.equal(0);
    });
  });

  describe("when the voter interact with the delegate function in the contract", function () {
    it("should transfer voting power", async () => {
      await giveRightToVote(deployer, user1);
      await giveRightToVote(deployer, user2);
      await ballotContract.connect(user1).delegate(user2.address);
      const user2Weight = await ballotContract.voters(user2.address);
      expect(user2Weight.weight).to.equal(2);
    });
  });

  describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
    it("should revert", async () => {
      await expect(
        giveRightToVote(user1, user2)
      ).to.be.revertedWith(ERR_ONLY_CHAIR);
    });
  });

  describe("when the an attacker interact with the vote function in the contract", function () {
    it("should revert", async () => {
      await expect(castVote(user1, 0)).to.be.revertedWith(
        ERR_NO_RIGHT_TO_VOTE
      );
    });
  });

  describe("when the an attacker interact with the delegate function in the contract", function () {
    it("should revert", async () => {
      await expect(ballotContract.connect(user1).delegate(user2.address)).to.be.reverted;
    });
  });

  describe("when someone interacts with the winningProposal function before any votes are cast", function () {
    it("should return 0", async () => {
      const proposal = await ballotContract.connect(deployer).winningProposal();
      expect(proposal).to.equal(0n);
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
    it("should return name of proposal 0", async () => {
      await giveRightToVote(deployer, user1);
      await castVote(user1, 0);
      const winnerNameString = ethers.utils.parseBytes32String(await ballotContract.winnerName());
      expect(winnerNameString).to.equal(PROPOSALS[0]);
    });
  });

  describe("when someone interacts with the winnerName function before any votes are cast", async () => {
    it("should return name of proposal 0", async () => {
      const winnerNameString = ethers.utils.parseBytes32String(await ballotContract.winnerName());
      expect(winnerNameString).to.equal(PROPOSALS[0]);
    });
  });

  describe("when someone interacts with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    it("should return the correct winner", async () => {
      await giveRightToVote(deployer, user1);
      await giveRightToVote(deployer, user2);
      await giveRightToVote(deployer, user3);
      await giveRightToVote(deployer, user4);
      await giveRightToVote(deployer, user5);
      await castVote(user1, 1);
      await castVote(user2, 2);
      await castVote(user3, 1);
      await castVote(user4, 1);
      await castVote(user5, 0);
      const winnerNameString = ethers.utils.parseBytes32String(await ballotContract.winnerName());
      expect(winnerNameString).to.equal(PROPOSALS[1]);
    });
  });
});