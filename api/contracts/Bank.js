const ethers = require("ethers").ethers;
const config = require('./json/config.json');
const SC_ABI = require('./json/BankV3.sol/BankV3.json').abi;
const SC_ADDRESS = config.bank;

module.exports = class Bank {
  constructor(dapp) {
    this.dapp = dapp;
  }

  async init() {
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    // const version = await this.sc.VERSION();
    // const basePrice = await this.sc.getBasePrice();
  }

  async swapCoinToToken(amount, receiver) {
    const amountWei = this.dapp.eth2wei(amount);
    return await this.sc.swapCoinToToken(amountWei, receiver);
  }

  async cleanUp() {
  }

}
