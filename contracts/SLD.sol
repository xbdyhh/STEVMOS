// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/stateful/Distribution.sol";
import "contracts/stateful/Staking.sol";

contract SLDToken is ERC20,  ReentrancyGuard {
    struct RedeemInfo {
        uint256 StEvmosAmount;
        uint256 EvmosAmount;
        int64 completionTime; // StEvmos  redeem end time
        uint256 creationHeight;
    }
    uint256 public totalStakedEvmos;

    string public validatorAddr;
    mapping(address => RedeemInfo[]) public userRedeems; // User's redeeming instances
    mapping(address => uint256) public deposits;

    string[] private stakingMethods = [
    MSG_DELEGATE,
    MSG_UNDELEGATE,
    MSG_REDELEGATE,
    MSG_CANCEL_UNDELEGATION
    ];

    string[] private distributionMethods = [MSG_WITHDRAW_DELEGATOR_REWARD];

    event Delegate(address indexed _from, string _to, uint256 _amount);
    event Withdraw(address indexed _to, uint256 _value);
    event Unbond(address indexed _userAddress, uint256 _StEvmosAmount , uint256 _EvmosAmount, int64 finishTime);
    event Redeem(address indexed _userAddress, uint256 _StEvmosAmount, uint256 _EvmosAmount);
    event CancelRedeem(address indexed _userAddress, uint256 _xEvmosAmount);

    StakingI stakingContract;
    DistributionI distribution;

    constructor(string memory _validatorAddr) ERC20("StEvmos", "STE") {
        validatorAddr = _validatorAddr;
        distribution = DistributionI(DISTRIBUTION_PRECOMPILE_ADDRESS);
    }

    /**
     * @notice Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }



    /**
    * @notice deposit caller's "amount" of Evmos to this contract.
    */
    function deposit() payable external {
        deposits[msg.sender] += msg.value;
    }

    function withdraw(uint256 _amount) external {
        require(deposits[msg.sender]>=_amount,"You don't have enough evmos withdraw!!!");
        deposits[msg.sender] -= _amount;
        (bool sent,) = payable(msg.sender).call{value: _amount}("");
        require(sent,"transfer evmos failed!!!");
    }

    function _approveRequiredMsgs(uint256 _amount) internal {
        bool successStk = STAKING_CONTRACT.approve(tx.origin, _amount, stakingMethods);
        require(successStk, "Staking Approve failed");
        bool successDist = DISTRIBUTION_CONTRACT.approve(tx.origin, distributionMethods);
        require(successDist, "Distribution Approve failed");
    }


    /**
    * @notice delegate caller's _amount" of Evmos to validator, and give them stEvmos
    * @param _amount the delegate quantity.
    */
    function delegate(uint256 _amount) external {
        //delegate the evmos token
        require(_amount <= deposits[msg.sender], "This address does not hold enough deposit!!!");
        uint256 _mintAmount;
        _approveRequiredMsgs(_amount);
        if (totalSupply() != 0) {
            Coin[] memory rewards =DISTRIBUTION_CONTRACT.withdrawDelegatorRewards(address(this), validatorAddr);
            if (rewards[0].amount != 0){
                totalStakedEvmos += rewards[0].amount;
            }
            _mintAmount = _amount * totalSupply() / totalStakedEvmos;
            _amount += rewards[0].amount;
        }else{
            _mintAmount = _amount;
        }
        _approveRequiredMsgs(_amount);
        STAKING_CONTRACT.delegate(address(this), validatorAddr, _amount);
        deposits[msg.sender] -=  _amount;
        totalStakedEvmos += _amount;
        // mint new stevmos
        _mint(msg.sender, _mintAmount);
        emit Delegate(msg.sender, validatorAddr, _amount);
    }

    /**
    * @notice Initiates redeem process (StEvmos to Evmos)
    * @param _amount the redeem quantity.
    */
    function unbond(uint256  _amount) external nonReentrant {
        require(_amount > 0, "redeem: StEvmosAmount cannot be null");
        _transfer(msg.sender, address(this), _amount);
        // get corresponding Evmos amount
        uint256 EvmosAmount = _amount * totalStakedEvmos / totalSupply();
        _approveRequiredMsgs(EvmosAmount);
        int64 completionTime = STAKING_CONTRACT.undelegate(address(this), validatorAddr, EvmosAmount);
        emit Unbond(msg.sender, _amount, EvmosAmount,completionTime);
        // add redeeming entry
        userRedeems[msg.sender].push(RedeemInfo(_amount,EvmosAmount,completionTime,block.number));
    }

    /**
    * @notice redeem process when vesting duration has been reached
    * @param _redeemIndex the Redemption index.
    */
    function redeem(uint256 _redeemIndex) external nonReentrant {
        require(_redeemIndex < userRedeems[msg.sender].length, "validateRedeem: redeem entry does not exist");
        RedeemInfo storage _redeem = userRedeems[msg.sender][_redeemIndex];
        // remove from SBT total
        uint256 ts = uint256(int256(_redeem.completionTime));
        require(block.timestamp >= ts, "finalizeRedeem: vesting duration has not ended yet");
        // sends due Evmos tokens
        (bool success, ) = payable(msg.sender).call{value:_redeem.EvmosAmount}("");
        require(success, "finalizeRedeem:Transfer failed.");
        _burn(address(this), _redeem.StEvmosAmount);
        totalStakedEvmos -=  _redeem.EvmosAmount;
        emit Redeem(msg.sender, _redeem.StEvmosAmount, _redeem.EvmosAmount);
        // remove redeem entry
        _deleteRedeemEntry(_redeemIndex);
    }

    /**
    * @notice delete Redeem Entry.
    * @param _index the Entry index.
    */
    function _deleteRedeemEntry(uint256 _index) internal {
        userRedeems[msg.sender][_index] = userRedeems[msg.sender][userRedeems[msg.sender].length - 1];
        userRedeems[msg.sender].pop();
    }


    /**
    * @notice returns quantity of "userAddress" pending redeems
    */
    function getUserRedeemsLength(address _userAddress) external view returns (uint256) {
        return userRedeems[_userAddress].length;
    }

    /**
    * @notice per 1E18 stEvmos can swap how much evmos
    */
    function getRatio() external view returns (uint256) {
        return totalStakedEvmos*1E18/totalSupply();
    }

    function getUserRedeemsList(address _userAddress) external view returns (RedeemInfo[] memory){
        return userRedeems[_userAddress];
    }
    receive() external payable {}

    fallback() external payable {}
}