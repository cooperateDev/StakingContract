const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", () => {
  let accounts;
  let owner;
  let staking;
  let token;
  const totalSupply = 1000000;

  before(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    // deploy token to test network
    const TKNContract = await ethers.getContractFactory("TKN");
    token = await TKNContract.deploy(totalSupply);
    await token.deployed();

    // deploy staking contract
    const StakingContract = await ethers.getContractFactory("Staking");
    staking = await StakingContract.deploy(token.address);
    await staking.deployed();

    // let the contract approve transfer tokens from user account
    await token.approve(staking.address, totalSupply);
  });

  describe("stake", () => {
    it("should stake specific token amount", async () => {
      const amount = 1000;
      await expect(staking.stake(amount))
        .to.emit(staking, "Stake")
        .withArgs(owner.address, amount);

      expect(await token.balanceOf(staking.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        totalSupply - amount
      );
    });

    it("shouldn't double stake", async () => {
      const amount = 1000;
      await expect(staking.stake(amount)).to.be.revertedWith(
        "Staker already exist"
      );
    });

    it("shouldn't stake none amount", async () => {
      const amount = 0;
      staking.stake(amount);
      await expect(staking.stake(amount)).to.be.revertedWith(
        "Amount should be not zero"
      );
    });

    it("should stake, unstake and stake", async () => {
      const amount = 1000;
      staking.unstake(amount);
      await expect(staking.stake(amount))
        .to.emit(staking, "Stake")
        .withArgs(owner.address, amount);

      expect(await token.balanceOf(staking.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        totalSupply - amount
      );
    });
  });

  describe("distribute", () => {
    it("should distribute reward successfully", async () => {
      const reward = 200;
      await expect(staking.distribute(reward))
        .to.emit(staking, "Distribute")
        .withArgs(reward);

      const expectedStakingBalance = 1000 + reward;
      const expectedOwnerBalance = totalSupply - expectedStakingBalance;
      expect(await token.balanceOf(staking.address)).to.equal(
        expectedStakingBalance
      );
      expect(await token.balanceOf(owner.address)).to.equal(
        expectedOwnerBalance
      );
    });

    it("should revert if there are no active stakes", async () => {
      const reward = 200;
      staking.unstake(1000);
      await expect(staking.distribute(reward)).to.be.revertedWith(
        "You need at least one stake"
      );
    });
  });

  describe("unstake", () => {
    it("should unstake tokens successfully", async () => {
      const amount = 500;
      const expectedReward = 500;
      staking.stake(1000);
      await expect(staking.unstake(amount))
        .to.emit(staking, "Unstake")
        .withArgs(owner.address, expectedReward);

      expect(await token.balanceOf(staking.address)).to.equal(500);
      expect(await token.balanceOf(owner.address)).to.equal(totalSupply - 500);
    });

    it("should revert if unstake more than balance", async () => {
      const amount = 1000;
      await expect(staking.unstake(amount)).to.be.revertedWith(
        "Not enough to unstake"
      );
    });
  });

  describe("unstakeable amount", () => {
    it("should return amount that can unstake", async () => {
      expect(await staking.unstakeableAmount()).to.equals(500);
    });
  });
});
