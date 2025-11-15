// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EncryptedPredictionMarket {
    struct Market {
        bytes32 encryptedQuestionHash;
        uint256 duration;
        uint256 createdAt;
        bool resolved;
        bool outcome;
        uint256 yesPool;
        uint256 noPool;
        address creator;
    }

    struct Position {
        bytes32 encryptedOutcomeHash;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => mapping(address => Position)) public positions;

    bytes32[] public marketIds;

    event MarketCreated(bytes32 indexed marketId, bytes32 encryptedQuestionHash, uint256 duration, address creator);
    event PositionSubmitted(bytes32 indexed marketId, address indexed user, bytes32 encryptedOutcomeHash, uint256 amount);
    event MarketResolved(bytes32 indexed marketId, bool outcome);
    event Claimed(bytes32 indexed marketId, address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    function createMarket(
        bytes32 _encryptedQuestionHash,
        uint256 _duration
    ) external returns (bytes32) {
        bytes32 marketId = keccak256(
            abi.encodePacked(_encryptedQuestionHash, block.timestamp, msg.sender)
        );

        markets[marketId] = Market({
            encryptedQuestionHash: _encryptedQuestionHash,
            duration: _duration,
            createdAt: block.timestamp,
            resolved: false,
            outcome: false,
            yesPool: 0,
            noPool: 0,
            creator: msg.sender
        });

        marketIds.push(marketId);
        
        emit MarketCreated(marketId, _encryptedQuestionHash, _duration, msg.sender);
        return marketId;
    }

    function submitPosition(
        bytes32 _marketId,
        bytes32 _encryptedOutcomeHash
    ) external payable {
        Market storage market = markets[_marketId];
        require(market.createdAt > 0, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(msg.value > 0, "Amount must be greater than 0");
        require(positions[_marketId][msg.sender].amount == 0, "Position already submitted");

        // Add 1-hour timelock before resolution
        require(
            block.timestamp < market.createdAt + market.duration - 1 hours,
            "Market resolution too close"
        );

        Position memory newPosition = Position({
            encryptedOutcomeHash: _encryptedOutcomeHash,
            amount: msg.value,
            claimed: false
        });

        positions[_marketId][msg.sender] = newPosition;

        // Update pool based on outcome
        // Note: Since outcome is encrypted, we need to handle this via backend
        market.yesPool += msg.value;

        emit PositionSubmitted(_marketId, msg.sender, _encryptedOutcomeHash, msg.value);
    }

    function resolveMarket(bytes32 _marketId, bool _outcome) external onlyAdmin {
        Market storage market = markets[_marketId];
        require(market.createdAt > 0, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.createdAt + market.duration, "Market not ready for resolution");

        market.resolved = true;
        market.outcome = _outcome;

        emit MarketResolved(_marketId, _outcome);
    }

    function claim(bytes32 _marketId) external {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];

        require(market.resolved, "Market not resolved");
        require(!position.claimed, "Already claimed");
        require(position.amount > 0, "No position found");

        // In this simplified version, all participants can claim their stake back
        // In a real implementation, this would verify the encrypted outcome against the actual outcome
        uint256 amount = position.amount;
        position.claimed = true;

        emit Claimed(_marketId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function getMarkets() external view returns (bytes32[] memory) {
        return marketIds;
    }

    function getMarket(bytes32 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getPosition(bytes32 _marketId, address _user) external view returns (Position memory) {
        return positions[_marketId][_user];
    }

    // Function to change admin
    function setAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
    }
}