const moment = require('moment');
const ethers = require("ethers").ethers;
const maxUINT = ethers.constants.MaxUint256;
const config = require('./config.json');
const SC_ABI = require('./json/BankV3.sol/BankV3.json').abi;
const SC_ADDRESS = config.bank;
const BigNumber = ethers.BigNumber;

module.exports = class Bank {
  constructor(dapp) {
    console.log('Bank created..');
    this.dapp = dapp;
  }

  async init() {
    console.log('Bank init..');
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    const version = await this.sc.VERSION();
    console.log('Bank VERSION: ' + version);
    const basePrice = await this.sc.getBasePrice();
    console.log('basePrice: ' + basePrice.toString());
  }

  async swapCoinToToken(amount, receiver) {
    const amountWei = this.dapp.eth2wei(amount);
    return await this.sc.swapCoinToToken(amountWei, receiver);
  }

  async cleanUp() {
    console.log('Bank cleanup..');
  }

}
