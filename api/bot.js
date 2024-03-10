const moment = require('moment');
const Dapp = require('./contracts/Dapp');
module.exports = async (req, res) => {
  const params = req.query;
  const result = await run(params);
  return res.json(result);
};

async function run(params) {
  let ret = {};
  const startTS = moment().valueOf();
  try {
    const CHAIN_ID = 1030;
    const PROVIDER_URL = 'https://evm.confluxrpc.com';
    const dapp = new Dapp(CHAIN_ID);
    const userAddress = await dapp.loadPrivateKey(null, PROVIDER_URL);

    ret = {
      userAddress
    }
  } catch (err) {
    ret = {
      error: true
    }
  }
  const endTS = moment().valueOf();

  ret.ms = endTS - startTS;
  return ret;
}