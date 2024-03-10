const moment = require('moment');
const ethers = require("ethers").ethers;

const config = require('./config.json');
const SC_ABI = require('./json/NFTRewardV3.sol/NFTRewardV3.json').abi;
const SC_ADDRESS = config.nftreward;
const BigNumber = ethers.BigNumber;

module.exports = class NFTReward {
  constructor(dapp) {
    console.log('NFTReward created..');
    this.dapp = dapp;
  }

  async init() {
    console.log('NFTReward init..');
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    const version = await this.sc.VERSION();
    console.log('NFTReward VERSION: ' + version);
    const data = await this.sc.getData();
    console.log('rewardHistory.length: ' + data[1].toString());
  }

  async claimReward(nftId) {
    const tx = await this.sc.claimReward(nftId);
    return tx;
  }

  async getUnclaimedReward(nftId) {
    const ret = await this.sc.getUnclaimedReward(nftId);
    return {
      reward: ret[0],
      rewardBP: ret[1],
      rewardEP: ret[2]
    };
  }

  async cleanUp() {
    console.log('NFTReward cleanup..');
  }

}
