const ethers = require("ethers").ethers;
const config = require('./json/config.json');
const SC_ABI = require('./json/PoolV3.sol/PoolV3.json').abi;
const SC_ADDRESS = config.pool;
const PP_ABI = require('./json/PosPoolABI.json');
const PP_ADDRESS = config.pospool;

module.exports = class Pool {
  constructor(dapp) {
    this.dapp = dapp;
  }

  async init() {
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    this.posPool = new ethers.Contract(PP_ADDRESS, PP_ABI, signer);
  }

  async lastUpdateTime() {
    const num = await this.sc.lastUpdateTime();
    return num.toNumber();
  }

  async getPosPoolSummary() {
    const summary = await this.posPool.userSummary(this.address);
    return summary;
  }

  async getData() {
    const poolAddress = this.address;
    const dapp = this.dapp;
    const isFork = dapp.IS_FORK;
    const poolETH = await dapp.PROVIDER.getBalance(poolAddress);
    const poolUSDT = await dapp.USDT.balanceOf(poolAddress);
    const poolToken = await dapp.TOKEN.balanceOf(poolAddress);

    const ppSummary = await this.getPosPoolSummary();
    const poolStakedETH = this.dapp.eth2wei((ppSummary.votes.toNumber() * 1000) + '');
    const posInterest = ppSummary.currentInterest;

    const block = await dapp.PROVIDER.getBlock();
    const curTime = block.timestamp;

    const spni = await this.sc.callStatic.pumpPrice();
    const ppInterest = spni[0];
    const ppNumToken = spni[1];
    let haveResult = ppInterest.gt('0') && ppNumToken.gt('0');
    if (isFork) haveResult = true;

    const lastPumpPriceTime = (await this.sc.lastPumpPriceTime()).toNumber();
    let nextPumpPriceTime = lastPumpPriceTime + (3600 * 3);
    // if (isFork) nextPumpPriceTime = lastPumpPriceTime + (1 * 60);

    const lastUpdateTime = (await this.sc.lastUpdateTime()).toNumber();
    let nextUpdateTime = lastUpdateTime + (3600 * 24);
    // if (isFork) nextUpdateTime = lastUpdateTime + (5 * 60);

    const mayPump = haveResult && curTime > nextPumpPriceTime;
    const mayUpdate = curTime > nextUpdateTime;

    const ret = {
      poolETH, poolUSDT, poolToken, poolStakedETH, posInterest,
      curTime,
      lastPumpPriceTime, nextPumpPriceTime, mayPump,
      lastUpdateTime, nextUpdateTime, mayUpdate
    }

    return ret;
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

  async pumpPriceByOne() {
    let tx;
    const val = this.dapp.eth2wei('1');
    tx = await this.sc.pumpPrice({ value: val });
    return tx;
  }

  async pumpPrice() {
    if (this.dapp.IS_FORK) return await this.pumpPriceByOne();
    let tx;
    tx = await this.sc.pumpPrice();
    return tx;
  }

  async update() {
    const tx = await this.sc.update();
    return tx;
  }

  async cleanUp() {
  }

}
