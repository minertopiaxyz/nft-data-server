const moment = require('moment');
const Dapp = require('./contracts/Dapp');
const { MongoClient, ServerApiVersion } = require('mongodb');
const MONGODB_CONNECTION_STR = process.env.MONGODB_CONNECTION_STR;

module.exports = async (req, res) => {
  const params = req.query;
  const result = await run(params);
  return res.json(result);
};

async function run(params) {
  let ret = {};
  let client;
  const startTS = moment().valueOf();
  try {
    const CHAIN_ID = 1030;
    const PROVIDER_URL = 'https://evm.confluxrpc.com';
    const dapp = new Dapp(CHAIN_ID);
    const userAddress = await dapp.loadPrivateKey(null, PROVIDER_URL);

    ret = {
      chainId: CHAIN_ID,
      providerUrl: PROVIDER_URL,
      userAddress,
      curTime: moment().format()
    }

    ret.dbResult = await saveToDB('bot_result', ret);

  } catch (err) {
    ret = {
      error: true
    }
  }
  const endTS = moment().valueOf();

  ret.ms = endTS - startTS;
  return ret;
}

async function saveToDB(dataName, json) {
  let ret = {
    saved: false
  };

  const client = new MongoClient(MONGODB_CONNECTION_STR, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const database = client.db("minertopia");
    const collection = database.collection("botData");

    const query = { dataName: dataName };
    const objToSave = Object.assign({ dataName }, json);
    const update = { $set: objToSave };
    const options = { upsert: true };

    await collection.updateOne(query, update, options);

    ret = {
      saved: true
    }
  } catch (err) {
    console.error(err);
  }

  await client.close();

  return ret;
}