//SPDX-License-Identifier: MIT
//pragma solidity >=0.7.0 <0.9.0;
pragma solidity 0.8.18;

contract Random {
    function getRandomNumber()
        public
        view
        returns (uint256 randomNumber)
    {
        return block.prevrandao;
    }

    function tossCoin() public view returns (bool heads) {
        return getRandomNumber() % 2 == 0;
    }
}