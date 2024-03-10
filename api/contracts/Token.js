const moment = require('moment');
const ethers = require("ethers").ethers;

const BigNumber = ethers.BigNumber;

const config = require('./config.json');
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
    console.log('token name: ' + name);
    this.name = name;

    const symbol = await this.sc.symbol();
    console.log('token symbol: ' + symbol);
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

