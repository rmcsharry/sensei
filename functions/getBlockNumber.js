// Imports the Alchemy SDK
const { Alchemy, Network } = require('alchemy-sdk');

// Configures the Alchemy SDK
const alchemyConfig = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

// Creates an Alchemy object instance with the config to use for making requests
const alchemy = new Alchemy(alchemyConfig);

// Function to get the block number from Alchemy
function getBlockNumber() {
  return alchemy.core.getBlockNumber();
}

module.exports = getBlockNumber;