require('dotenv').config();

const moment = require('moment');
const Dapp = require('./api/contracts/Dapp');
const { MongoClient, ServerApiVersion } = require('mongodb');
const MONGODB_CONNECTION_STR = process.env.MONGODB_CONNECTION_STR;
const PK = process.env.PRIVATEKEY_MAINNET;

let busy = false;
run();

async function run() {
  setInterval(async () => {
    if (!busy) {
      busy = true;
      await update();
      busy = false;
    }
  }, 5000);
}

async function update() {
  let ret = {};
  const startTS = moment().valueOf();
  try {
    const CHAIN_ID = 1030;
    const PROVIDER_URL = 'https://evm.confluxrpc.com';
    const dapp = new Dapp(CHAIN_ID);
    const userAddress = await dapp.loadPrivateKey(PK, PROVIDER_URL);
    await dapp.initContracts();
    console.log('dapp ready..');
    console.log(dapp.getUserAddress());
    const result = await dapp.updateByBot();
    ret = Object.assign({
      chainId: CHAIN_ID,
      providerUrl: PROVIDER_URL,
      userAddress,
      curTime: (moment().utc().utcOffset("+07:00")).format()
    }, result);

    await saveToDB('bot_result', ret);

  } catch (err) {
    console.error(err);
    ret = {
      error: true,
      errMsg: JSON.stringify(err)
    }
  }
  const endTS = moment().valueOf();

  ret.ms = endTS - startTS;

  console.log(ret);
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