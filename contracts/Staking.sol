//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    IERC20 public stakingToken;

    uint256 constant decimals = 1e18;
    uint256 public totalStakedTokens;
    uint256 private rewardDistributed;
    uint256 public totalStakerCount;

    struct Staker {
        uint256 amount;
        uint256 lastReward;
        bool isAlreadyExist;
    }

    mapping(uint256 => address) stakerID;
    mapping(address => Staker) stakers;

    event Stake(address indexed sender, uint256 stake);
    event Unstake(address indexed staker, uint256 amount);
    event Distribute(uint256 indexed amount);

    /**
     * @dev Initializes interface to token we are going to interact with,
     * also get rid of zero index.
     */
    constructor(address tokenAddress) {
        stakingToken = IERC20(tokenAddress);
    }

    /**
     * @dev Stake specific amount (`amount`) of tokens from caller address to contract address
     * User can stake if didn't stake before or if his stake equals to zero
     * If user already stake some tokens he can't stake again
     */
    function stake(uint256 amount) public {
        require(amount != 0, "Amount should be not zero");
        require(
            !stakers[msg.sender].isAlreadyExist ||
                stakers[msg.sender].amount == 0,
            "Staker already exist"
        );

        if (!stakers[msg.sender].isAlreadyExist)
            stakers[msg.sender].isAlreadyExist = true;

        stakers[msg.sender].amount = amount;
        stakers[msg.sender].lastReward = rewardDistributed;
        totalStakedTokens += amount;
        stakerID[totalStakerCount++] = msg.sender;
        stakingToken.transferFrom(msg.sender, address(this), amount);

        emit Stake(msg.sender, amount);
    }

    /**
     * @dev Returns reward for the particular stake holder (`Staker`)
     * using decimals to bring values back to normal format
     */
    function calculateReward(Staker memory staker)
        internal
        view
        returns (uint256)
    {
        return
            (staker.amount * (rewardDistributed - staker.lastReward)) /
            decimals;
    }

    /**
     * @dev Distributes reward (`reward`) proportionally to all stakers
     * multiply float value by decimals to not to lose fractional part
     */
    function distribute(uint256 reward) public onlyOwner {
        require(totalStakedTokens != 0, "You need at least one stake");

        rewardDistributed += (reward * decimals) / totalStakedTokens;
        stakingToken.transferFrom(msg.sender, address(this), reward);

        emit Distribute(reward);
    }

    /**
     * @dev Unstake all tokens the user received during staking period
     */
    function unstake(uint256 amount) public {
        require(stakers[msg.sender].isAlreadyExist, "Staker not exist");
        Staker storage holder = stakers[msg.sender];
        require(holder.amount >= amount, "Not enough to unstake");

        uint256 total = amount + calculateReward(holder);
        totalStakedTokens -= amount;
        holder.amount -= amount;
        stakingToken.transfer(msg.sender, total);

        emit Unstake(msg.sender, total);
    }

    function unstakeableAmount() external view returns (uint256) {
        return stakers[msg.sender].amount;
    }
}
