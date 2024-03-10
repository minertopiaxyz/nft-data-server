const moment = require('moment');
const ethers = require("ethers").ethers;

const config = require('./config.json');
const SC_ABI = require('./json/NFTV3.sol/NFTV3.json').abi;
const SC_ADDRESS = config.nft;
const BigNumber = ethers.BigNumber;

module.exports = class NFT {
  constructor(dapp) {
    console.log('NFT created..');
    this.dapp = dapp;
  }

  async init() {
    console.log('NFT init..');
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
    const version = await this.sc.VERSION();
    console.log('NFT VERSION: ' + version);
    const totalSupply = await this.sc.totalSupply();
    console.log('totalSupply: ' + totalSupply.toString());
    const owner = await this.sc.owner();
    this.ownerAddress = owner.toLowerCase();
  }

  async getUserNftIds() {
    const userAddress = this.dapp.getUserAddress();
    let b = await this.sc.balanceOf(userAddress);
    b = b.toNumber();

    const ret = [];
    for (let i = 0; i < b; i++) {
      let nId = await this.sc.tokenOfOwnerByIndex(userAddress, i);
      ret.push(nId.toNumber());
    }

    return ret;
  }

  async getUserNft() {
    const ret = {};
    const nftIds = await this.getUserNftIds();
    ret.nftIds = nftIds;
    ret.nftId2data = {};
    for (let i = 0; i < nftIds.length; i++) {
      const nftId = nftIds[i];
      const data = await this.getNftData(nftId);
      ret.nftId2data[nftId] = data;
    }

    console.log('** user nft **');
    console.log(ret);

    return ret;
  }

  async tokenURI(nftId) {
    return await this.sc.tokenURI(nftId);
  }

  async getNftData(nftId) {
    const tokenURI = await this.tokenURI(nftId);
    const nd = await this.sc.getNFTData(nftId);
    const unclaimedReward = await this.dapp.NFT_REWARD.getUnclaimedReward(nftId);

    return {
      tokenURI,
      nftData: {
        id: nd[0].toNumber(),
        createdAt: nd[1].toNumber(),
        basePower: nd[2].toString(),
        extraPower: nd[3].toString(),
        unclaimedReward
      }
    }
  }

  async setURL(url1, url2) {
    const tx = await this.sc.setURL(url1, url2);
    return tx;
  }

  async mint() {
    const amountWei = this.dapp.eth2wei('100');
    const userAddress = this.dapp.getUserAddress();
    const tx = await this.sc.mint(userAddress, { value: amountWei })
    return tx;
  }

  async mintByAdminFor(receiverAddress) {
    const amountWei = this.dapp.eth2wei('1');
    const tx = await this.sc.mint(receiverAddress, { value: amountWei })
    return tx;
  }

  async powerUp(nftId, amount) {
    const amountWei = this.dapp.eth2wei(amount);
    const tx = await this.sc.powerUp(nftId, { value: amountWei })
    return tx;
  }

  async cleanUp() {
    console.log('NFT cleanup..');
  }

}
