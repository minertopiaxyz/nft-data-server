const moment = require('moment');
const ethers = require("ethers").ethers;

const config = require('./json/config.json');
const SC_ABI = require('./json/VaultV3.sol/VaultV3.json').abi;
const SC_ADDRESS = config.vault;

module.exports = class Vault {
  constructor(dapp) {
    this.dapp = dapp;
  }

  async init() {
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
  }

  async getAPY() {
    const wei2eth = this.dapp.wei2eth;
    const data = await this.sc.getData();
    const num = data[1].toNumber();
    if (!(num > 1)) return 0;
    let totalRps = 0;
    let maxTs = 0;
    let minTs = 0;
    let rows = [];
    for (let i = (num - 1); i >= 0; i--) {
      const sd = await this.sc.getSessionData(i);
      const ts = sd[3].toNumber();
      const rps = Number(wei2eth(sd[2]));
      rows.unshift({ ts, rps });
      if (ts < (moment().unix() - (7 * 24 * 3600))) break;
    }

    for (let i = 1; i < rows.length; i++) {
      totalRps = totalRps + rows[i].rps;
    }
    minTs = rows[0].ts;
    maxTs = rows[rows.length - 1].ts;

    const delta = maxTs - minTs;
    const oneYear = (365 * 24 * 3600);
    const yearRps = (totalRps * oneYear) / delta;
    const apy = yearRps * 100;

    // const apyData = {
    //   numRows: num,
    //   minTs,
    //   maxTs,
    //   totalRps,
    //   delta,
    //   apy
    // }

    return apy;
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

    const apy = await this.getAPY();
    ret.apy = apy;

    return ret;
  }

  async cleanUp() {
  }

}
