const moment = require('moment');
const ethers = require("ethers").ethers;

const config = require('./config.json');
const SC_ABI = require('./json/PoolV3.sol/PoolV3.json').abi;
const SC_ADDRESS = config.pool;
const PP_ABI = require('./json/PosPoolABI.json');
const PP_ADDRESS = config.pospool;
const BigNumber = ethers.BigNumber;

module.exports = class Pool {
  constructor(dapp) {
    console.log('Pool created..');
    this.dapp = dapp;
  }

  async init() {
    console.log('Pool init..');
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;

    const version = await this.sc.VERSION();
    console.log('Pool VERSION: ' + version);

    this.posPool = new ethers.Contract(PP_ADDRESS, PP_ABI, signer);
  }

  async lastUpdateTime() {
    const num = await this.sc.lastUpdateTime();
    return num.toNumber();
  }

  async getPosPoolSummary() {
    // not applicable on testnet
    const summary = await this.posPool.userSummary(this.address);
    console.log(summary);
    return summary;
  }

  async getData() {
    const poolAddress = this.address;
    const dapp = this.dapp;
    const poolETH = await dapp.PROVIDER.getBalance(poolAddress);
    const poolUSDT = await dapp.USDT.balanceOf(poolAddress);
    const poolToken = await dapp.TOKEN.balanceOf(poolAddress);

    const ppSummary = await this.getPosPoolSummary();
    const poolStakedETH = this.dapp.eth2wei((ppSummary.votes.toNumber() * 1000) + '');
    const posInterest = ppSummary.currentInterest;

    console.log({
      poolETH: poolETH.toString(),
      poolUSDT: poolUSDT.toString(),
      poolToken: poolToken.toString()
    });

    const spni = await this.simulatePumpPrice(true);
    const ppInterest = dapp.wei2eth(spni[0]);
    const ppNumToken = dapp.wei2eth(spni[1]);
    console.log('** spni **');
    console.log({ ppInterest, ppNumToken });

    return {
      poolETH, poolUSDT, poolToken, poolStakedETH, posInterest
    }
  }

  async debug1(amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.debug(amountWei, 0, 0);
    return tx;
  }

  async debug2(amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.debug(0, amountWei, 0);
    return tx;
  }

  async debug3(amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.debug(0, 0, amountWei);
    return tx;
  }

  async stake(addAmount) {
    let tx;
    if (addAmount) {
      const amountWei = this.dapp.eth2wei(addAmount);
      tx = await this.sc.stake({ value: amountWei });
    } else {
      tx = await this.sc.stake();
    }
    return tx;
  }

  async simulatePumpPrice(withoutInterest) {
    if (withoutInterest) {
      const val = this.dapp.eth2wei('1');
      return await this.sc.callStatic.pumpPrice({ value: val });
    }

    return await this.sc.callStatic.pumpPrice();
  }

  async pumpPrice(withoutInterest) {
    let tx;
    if (withoutInterest) {
      const val = this.dapp.eth2wei('1');
      tx = await this.sc.pumpPrice({ value: val });
      return tx;
    }

    tx = await this.sc.pumpPrice();
    return tx;
  }

  async update() {
    const tx = await this.sc.update();
    return tx;
  }

  async cleanUp() {
    console.log('Pool cleanup..');
  }

}
