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

const BigNumber = ethers.BigNumber;
const config = require('./config.json');

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

    await this.getUserData();
  }

  async cleanUp() {
    // const cs = [this.BANK, this.NFT];
    // for (let i = 0; i < cs.length; i++) {
    //   if (cs[i]) await cs[i].cleanUp();
    // }
    // console.log('Blockchain cleanup...');
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
    this.SIGNER = new ethers.Wallet(pk, this.PROVIDER);
    this.USER_ADDRESS = await this.SIGNER.getAddress();
    return this.USER_ADDRESS;
  }

  async getLandingPageData() {
    return {
      price: '0.0001',
      apy: '33',
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

  async getUserData() {
    const userAddress = this.USER_ADDRESS;
    const userETH = await this.PROVIDER.getBalance(userAddress);
    const userUSDT = await this.USDT.balanceOf(userAddress);
    const userToken = await this.TOKEN.balanceOf(userAddress);


    const lastUpdateTime = await this.POOL.lastUpdateTime();
    const nextUpdateTime = lastUpdateTime + 86400;

    console.log({
      userETH: userETH.toString(),
      userUSDT: userUSDT.toString(),
      userToken: userToken.toString(),
    });

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
    console.log('allowance: ' + allowance.toString());
    return !ok;
  }

  async approve(tokenSC, spenderAddress) {
    const tx = await tokenSC.approve(spenderAddress, maxUINT);
    return tx;
  }

  async test() {
    await this.GUARD.approve();
    const guardData = await this.GUARD.getData();
    if (guardData.action) {
      console.log({ guardData });
      const tx = await this.GUARD.run(guardData.sample, guardData.profitPump, guardData.profitDump);
      console.log(tx.hash);
      await tx.wait();
    }
  }

  async test_old() {
    let tx;
    const ud = await this.getUserData();

    const userAddress = this.USER_ADDRESS;
    const userNft = await this.NFT.getUserNft();
    console.log(JSON.stringify(userNft, null, 2));

    const nftIds = userNft.nftIds;
    const nftId = nftIds.length > 0 ? userNft.nftIds[0] : null;

    // tx = await this.NFT.mint(); // mint nft
    // tx = await this.NFT.powerUp(nftId, '50'); // powerup nft
    // tx = await this.NFT.setURL('https://nft-info.com/nfts/nftdata', '.json'); // set URL - not checked

    // console.log(tx.hash);
    // await tx.wait();
    // console.log('done');

    // const check = await this.NFT.tokenURI(1);
    // console.log(check);
    // return;

    // get nft reward amount
    const ur = await this.NFT_REWARD.getUnclaimedReward(nftId);
    console.log('NR.unclaimedReward:');
    console.log(ur);

    // est. next reward time
    const estNRT = await this.POOL.nextUpdateTime();
    console.log('estNRT: ' + estNRT);

    // pool cfx, usdt, token
    const poolData = await this.POOL.getData();
    console.log(poolData);

    // pool staked cfx
    await this.POOL.getPosPoolSummary(); // fork

    // pool stake
    // tx = await this.POOL.stake('1000');

    // pool pump price // not checked in testnet

    // console.log(tx.hash);
    // await tx.wait();
    // console.log('done');

    // approve bank
    let na = await this.needApprove(this.USDT, this.BANK.address);
    if (na) {
      tx = await this.approve(this.USDT, this.BANK.address);
      console.log(tx.hash);
      await tx.wait();
      console.log('done');
    } else console.log('allowance ok');

    na = await this.needApprove(this.TOKEN, this.BANK.address);
    if (na) {
      tx = await this.approve(this.TOKEN, this.BANK.address);
      console.log(tx.hash);
      await tx.wait();
      console.log('done');
    } else console.log('allowance ok');

    na = await this.needApprove(this.TOKEN, this.VAULT.address);
    if (na) {
      tx = await this.approve(this.TOKEN, this.VAULT.address);
      console.log(tx.hash);
      await tx.wait();
      console.log('done');
    } else console.log('allowance ok');

    // bank swapCoinToToken
    // vault stake
    // vault user data
    // pool debug1
    // pool update

    // tx = await this.BANK.swapCoinToToken('1', userAddress); // get 1$ worth token
    // const userToken = this.wei2eth(ud.userToken);
    // tx = await this.VAULT.stakeToken(userToken); // vault stake

    // tx = await this.POOL.debug1('10'); // pool debug1, should use pump price test
    // tx = await this.POOL.update(); // pool update

    // console.log(tx.hash);
    // await tx.wait();
    // console.log('done');

    // vault reward check
    const ur1 = await this.NFT_REWARD.getUnclaimedReward(nftId);
    console.log('unclaimedReward:');
    console.log(ur);

    const ur2 = await this.VAULT.getUnclaimedReward(userAddress);
    console.log(ur2.toString());

    // nftReward claim reward
    // tx = await this.NFT_REWARD.claimReward(nftId);
    // vault claim reward((
    // tx = await this.VAULT.claimReward(userAddress);

    // console.log(tx.hash);
    // await tx.wait();
    // console.log('done');

    const vud = await this.VAULT.getUserData();
    console.log(vud);
    const staked = this.wei2eth(vud.stake);
    console.log(staked);

    // vault unstake - fork
    // vault withdraw - fork
    // tx = await this.VAULT.unstakeToken(staked);
    // tx = await this.VAULT.withdrawToken();

    // pool debug2 - fork
    // tx = await this.POOL.debug2('1000'); // check poolETH
    // pool debug3 - fork
    // tx = await this.POOL.debug3('1000'); // check poolETH

    // const v1 = this.wei2eth('150000000000000000000');
    // const v2 = this.wei2eth('1150000000000000000000');
    // console.log({ v1, v2 });

    // console.log(tx.hash);
    // await tx.wait();
    // console.log('done');

    // check pumpPrice
    // guard mechanism
    // guard buySwapSellBank - not checked in testnet
    // guard buyBankSellSwap - not checked in testnet


  }
}
