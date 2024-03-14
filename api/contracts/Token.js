const ethers = require("ethers").ethers;
const SC_ABI = require('./json/ERC20.sol/ERC20.json').abi;

module.exports = class Token {
  constructor(dapp) {
    this.dapp = dapp;
  }

  async init(tokenAddress) {
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(tokenAddress, SC_ABI, signer);
    this.address = this.sc.address;

    const name = await this.sc.name();
    this.name = name;
    const symbol = await this.sc.symbol();
    this.symbol = symbol;
  }

  async balanceOf(addr) {
    return await this.sc.balanceOf(addr);
  }

  async allowance(owner, spender) {
    return await this.sc.allowance(owner, spender);
  }

  async approve(spender, amountWei) {
    return await this.sc.approve(spender, amountWei);
  }

  async cleanUp() {
  }
}

