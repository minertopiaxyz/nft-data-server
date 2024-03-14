const ethers = require("ethers").ethers;

const config = require('./json/config.json');
const SC_ABI = require('./json/NFTV3.sol/NFTV3.json').abi;
const SC_ADDRESS = config.nft;

module.exports = class NFT {
  constructor(dapp) {
    this.dapp = dapp;
  }

  async init() {
    const signer = this.dapp.getSigner();
    this.sc = new ethers.Contract(SC_ADDRESS, SC_ABI, signer);
    this.address = this.sc.address;
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
    const wei2eth = this.dapp.wei2eth;

    const ret = {};
    const totalSupply = await this.sc.totalSupply();
    ret.totalSupply = totalSupply.toNumber();
    const nftIds = await this.getUserNftIds();
    ret.nftIds = nftIds;
    ret.nftId2data = {};
    const nrd = await this.dapp.NFT_REWARD.sc.getData();
    const totalEP = nrd[4];
    const b = Number(wei2eth(totalEP));
    for (let i = 0; i < nftIds.length; i++) {
      const nftId = nftIds[i];
      const data = await this.getNftData(nftId);

      const ep = data.nftData.extraPower;
      const a = Number(wei2eth(ep));
      const percentage = (a * 100) / b;

      data.percentage = percentage;
      ret.nftId2data[nftId] = data;
    }

    const lastUpdateTime = await this.dapp.POOL.lastUpdateTime();
    const nextUpdateTime = lastUpdateTime + (24 * 3600);
    ret.nextUpdateTime = nextUpdateTime;

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
    let amountWei = this.dapp.eth2wei('100');
    const userAddress = this.dapp.getUserAddress();
    if (userAddress.toLowerCase() === (config.deployer).toLowerCase()) {
      amountWei = this.dapp.eth2wei('1');
    }
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
  }

}
