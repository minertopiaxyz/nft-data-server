const moment = require('moment');
const ethers = require("ethers").ethers;
const maxUINT = ethers.constants.MaxUint256;
const Bank = require('./Bank');
const Guard = require('./Guard');
const NFT = require('./NFT');
const NFTReward = require('./NFTReward');
const Token = require('./Token');
const Pool = require('./Pool');
const Vault = require('./Vault');

const config = require('./json/config.json');

// dont include outside file. ex: Lib

const delay = async (ms) => {
  console.log('wait for ' + (ms / 1000) + ' secs...');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

module.exports = class Dapp {
  constructor(chainId) {
    this.CHAIN_ID = chainId;
    this.PROVIDER = null;
    this.SIGNER = null;
    this.USER_ADDRESS = null;
    this.RANDOM_WALLET = false;
  }

  async initContracts() {
    const signer = this.SIGNER;
    if (!signer) throw new Error('SIGNER not loaded.');

    this.BANK = new Bank(this);
    await this.BANK.init();
    this.GUARD = new Guard(this);
    await this.GUARD.init();
    this.VAULT = new Vault(this);
    await this.VAULT.init();
    this.NFT = new NFT(this);
    await this.NFT.init();
    this.NFT_REWARD = new NFTReward(this);
    await this.NFT_REWARD.init();
    this.USDT = new Token(this);
    await this.USDT.init(config.coin);
    this.TOKEN = new Token(this);
    await this.TOKEN.init(config.token);
    this.POOL = new Pool(this);
    await this.POOL.init();
  }

  async cleanUp() {
    // const cs = [this.BANK, this.NFT];
    // for (let i = 0; i < cs.length; i++) {
    //   if (cs[i]) await cs[i].cleanUp();
    // }
  }

  async detectMetamask() {
    if (!window.ethereum) throw new Error('Please install Metamask and reload!');
    window.ethereum.on('chainChanged', (_chainId) => window.location.reload());
    let chainId = await window.ethereum.request({ method: 'eth_chainId' });
    chainId = Number(chainId);
    if (chainId !== this.CHAIN_ID) throw new Error('Please connect metamask to right network!');
    let connected = window.ethereum.isConnected();
    return connected;
  }

  async loadMetamask() {
    window.ethereum.enable();
    this.PROVIDER = new ethers.providers.Web3Provider(window.ethereum);
    this.SIGNER = this.PROVIDER.getSigner();
    this.USER_ADDRESS = await this.SIGNER.getAddress();
    return this.USER_ADDRESS;
  }

  async loadPrivateKey(pk, providerUrl) {
    if (!pk) {
      const tmp = ethers.Wallet.createRandom();
      pk = tmp.privateKey;
      this.RANDOM_WALLET = true;
    }
    this.PROVIDER = new ethers.providers.JsonRpcProvider(providerUrl);
    this.IS_FORK = (providerUrl === 'http://127.0.0.1:8545');
    this.SIGNER = new ethers.Wallet(pk, this.PROVIDER);
    this.USER_ADDRESS = await this.SIGNER.getAddress();
    return this.USER_ADDRESS;
  }

  async getLandingPageData() {
    const wei2eth = this.wei2eth;
    // const eth2wei = this.eth2wei;
    let apy = await this.VAULT.getAPY();
    if (Number(apy) > 1000 || Number(apy) === 0) apy = '>1000';
    const price = await this.GUARD.getSwapPrice();
    const ii = '1000000000'
    let p = price.div(ii);
    p = p.mul(ii);
    // p = Math.floor(Number(wei2eth(p))) / 1000000000;
    // p = eth2wei(p);
    p = wei2eth(p);
    return {
      price: p,
      apy: apy,
    }
  }

  isAdmin() {
    const a = this.USER_ADDRESS;
    const b = config.deployer;
    return (a.toLowerCase() === b.toLowerCase());
  }

  isReadOnly() {
    return this.RANDOM_WALLET;
  }

  getSigner() {
    return this.SIGNER;
  }

  getUserAddress() {
    return this.USER_ADDRESS;
  }

  wei2eth(wei) {
    return ethers.utils.formatUnits(wei, "ether");
  }

  eth2wei(eth) {
    return ethers.utils.parseEther(eth);
  }

  async getBlockTS() {
    return (await this.PROVIDER.getBlock('latest')).timestamp;
  }

  async getUserData() {
    const userAddress = this.USER_ADDRESS;
    const userETH = await this.PROVIDER.getBalance(userAddress);
    const userUSDT = await this.USDT.balanceOf(userAddress);
    const userToken = await this.TOKEN.balanceOf(userAddress);


    const lastUpdateTime = await this.POOL.lastUpdateTime();
    const nextUpdateTime = lastUpdateTime + 86400;

    return {
      userETH, userUSDT, userToken, lastUpdateTime, nextUpdateTime
    }
  }

  async needApprove(tokenSC, spenderAddress) {
    const userAddress = this.getUserAddress();
    const token = tokenSC;
    const allowance = await token.allowance(userAddress, spenderAddress);
    const owned = await token.balanceOf(userAddress);
    const ok = allowance.gte(owned) && allowance.gt('0');
    return !ok;
  }

  async approve(tokenSC, spenderAddress) {
    const tx = await tokenSC.approve(spenderAddress, maxUINT);
    return tx;
  }

  async initByBot(msDelay) {
    if (!msDelay) msDelay = 100;
    let tx;
    console.log('** GUARD APPROVE **');
    await this.GUARD.approve();
    await delay(msDelay);
    console.log('** INIT POOL STAKE **');
    tx = await this.POOL.stake('1000');
    console.log(tx.hash);
    await tx.wait();
    console.log('done');
    await delay(msDelay);
    console.log('** NFT 1 MINT **');
    tx = await this.NFT.mint();
    console.log(tx.hash);
    await tx.wait();
    console.log('done');
    await delay(msDelay);
    console.log('** NFT 1 POWER UP **');
    tx = await this.NFT.powerUp('1', '1');
    console.log(tx.hash);
    await tx.wait();
    console.log('done');
    await delay(msDelay);
    console.log('** VAULT APPROVE **');
    await this.approve(this.TOKEN.sc, this.VAULT.address);
    console.log(tx.hash);
    await tx.wait();
    console.log('done');
    await delay(msDelay);
    console.log('** VAULT STAKE **');
    tx = await this.VAULT.stakeToken('1');
    console.log(tx.hash);
    await tx.wait();
    console.log('done');
  }

  async updateByBot() {
    const ret = {};
    console.log("\n\n");
    console.log('*****************************************');
    console.log(moment().format());
    console.log('*****************************************');
    if (this.IS_FORK) console.log('use fork chain');

    ret.tsjkt = (moment().utc().utcOffset("+07:00")).format();

    await this.GUARD.approve();
    const guardData = await this.GUARD.getData();
    const mayGuard = guardData.mayGuard;
    console.log(guardData);

    if (mayGuard) {
      console.log('GUARD.run');
      const tx = await this.GUARD.run(guardData.sample, guardData.profitPump, guardData.profitDump);
      console.log(tx.hash);
      await tx.wait();

      const poolData = await this.POOL.getData();

      ret.txName = 'GUARD.run';
      ret.txHash = tx.hash;
      ret.guardData = guardData;
      ret.poolData = poolData;
    } else {
      const poolData = await this.POOL.getData();
      const mayPump = poolData.mayPump;
      const mayUpdate = poolData.mayUpdate;
      console.log(poolData);

      if (mayUpdate) {
        console.log('POOL.update');
        const tx = await this.POOL.update();
        console.log(tx.hash);
        await tx.wait();
        ret.txName = 'POOL.update';
        ret.txHash = tx.hash;
      } else if (mayPump) {
        console.log('POOL.pumpPrice');
        const tx = await this.POOL.pumpPrice();
        console.log(tx.hash);
        await tx.wait();
        ret.txName = 'POOL.pumpPrice';
        ret.txHash = tx.hash;
      }

      ret.guardData = guardData;
      ret.poolData = poolData;
    }

    if (this.IS_FORK) {
      const tx = await this.SIGNER.sendTransaction({
        to: config.deployer,
        value: 0
      });
      await tx.wait();
      console.log('empty tx: ' + tx.hash);
    }

    console.log('*****************************************');
    console.log("\n\n");
    return ret;
  }

}
