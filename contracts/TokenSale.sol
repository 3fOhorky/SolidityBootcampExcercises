// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyERC20Token.sol";
import "./MyERC721Token.sol";

contract TokenSale is Ownable {
    uint256 public ratio;
    uint256 public price;
    MyERC20Token public paymentToken;
    MyERC721Token public nftContract;
    uint256 public withdrawableAmount;

    constructor(
        uint256 _ratio,
        uint256 _price,
        MyERC20Token _paymentToken,
        address _nftContract
    ) {
        ratio = _ratio;
        price = _price;
        paymentToken = _paymentToken;
        nftContract = MyERC721Token(_nftContract);
    }

    function buyTokens() external payable {
        uint256 amount = msg.value / ratio;
        paymentToken.mint(msg.sender, amount);
    }

    function returnTokens(uint256 amount) external {
        paymentToken.burnFrom(msg.sender, amount);
        payable(msg.sender).transfer(amount * ratio);
    }

    function buyNFT(uint256 tokenId) external {
        paymentToken.transferFrom(msg.sender, address(this), price);
        nftContract.safeMint(msg.sender, tokenId);
        withdrawableAmount += price / 2;
    }

    function returnNFT(uint256 tokenId) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Caller is not the owner of the NFT");

        uint256 refundAmount = price / 2;

        require(paymentToken.balanceOf(address(this)) >= refundAmount, "Contract has insufficient funds to refund");

        // Alternatively transfer the NFT to the contract or another address
        nftContract.burn(tokenId);

        withdrawableAmount -= refundAmount;
        paymentToken.transfer(msg.sender, refundAmount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        withdrawableAmount -= amount;
        paymentToken.transfer(owner(), amount);
    }
}