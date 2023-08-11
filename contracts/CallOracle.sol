// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "usingtellor/contracts/UsingTellor.sol";

contract CallOracle is UsingTellor {
    constructor(address payable _tellorAddress) UsingTellor(_tellorAddress) {}

    function getBtcSpotPrice() external view returns (uint256) {
        bytes memory _queryData = abi.encode(
            "SpotPrice",
            abi.encode("btc", "usd")
        );
        bytes32 _queryId = keccak256(_queryData);

        (bytes memory _value, uint256 _timestampRetrieved) = getDataBefore(
            _queryId,
            block.timestamp - 20 minutes
        );
        if (_timestampRetrieved == 0) return 0;
        require(block.timestamp - _timestampRetrieved < 24 hours, "The data is too old!");
        return abi.decode(_value, (uint256));
    }
}
