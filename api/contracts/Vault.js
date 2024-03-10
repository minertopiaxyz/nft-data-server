const moment = require('moment');
const ethers = require("ethers").ethers;

const config = require('./config.json');
const SC_ABI = require('./json/VaultV3.sol/VaultV3.json').abi;
const SC_ADDRESS = config.vault;
const BigNumber = ethers.BigNumber;

module.exports = class Vault {
  constructor(dapp) {
    console.log('Vault created..');
    this.dapp = dapp;
  }

  async init() {
    console.log('Vault init..');
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    const version = await this.sc.VERSION();
    console.log('Vault VERSION: ' + version);
    const data = await this.sc.getData();
    console.log('rewardHistory.length: ' + data[1].toString());
  }

  async stakeToken(amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.stakeToken(amountWei);
    return tx;
  }

  async unstakeToken(amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.unstakeToken(amountWei);
    return tx;
  }

  async withdrawToken() {
    const tx = await this.sc.withdrawToken();
    return tx;
  }

  async claimReward() {
    const tx = await this.sc.claimReward();
    return tx;
  }

  async getUnclaimedReward(userAddress) {
    const user = userAddress ? userAddress : this.dapp.getUserAddress();
    return await this.sc.getUnclaimedReward(user);
  }

  async getUserData(userAddress) {
    const user = userAddress ? userAddress : this.dapp.getUserAddress();
    const ud = await this.sc.getUserData(user);
    const ret = {
      turn: ud[0].toNumber(),
      stake: ud[1],
      allowUnstakeTime: ud[2].toNumber(),
      allowWithdrawTime: ud[3].toNumber(),
      pendingWithdraw: ud[4]
    }
    const unclaimedReward = await this.getUnclaimedReward();
    ret.unclaimedReward = unclaimedReward;

    const needApprove = await this.dapp.needApprove(this.dapp.TOKEN, this.address);
    ret.needApprove = needApprove;

    return ret;
  }

  async cleanUp() {
    console.log('Vault cleanup..');
  }

}
