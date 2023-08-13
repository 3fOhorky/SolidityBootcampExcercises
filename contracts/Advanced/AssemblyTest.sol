// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import {GetCode} from "./get-code.sol";

contract AssemblyTest {
    using GetCode for address;

    function getThisCode() public view returns (bytes memory code) {
        return address(this).at();
    }
}
