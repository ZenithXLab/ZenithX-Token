require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config({path:".env"});
const NodeKey=process.env.nodeKey;
const Privatekey=process.env.privatekey;
/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  defaultNetwork: "bsctestnet",
  networks: {
     hardhat: {
      gasPrice: 10000000000000, // Set a higher value
    },
    bsctestnet: {
      url: NodeKey,
      accounts: [Privatekey]
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  evmVersion: "shanghai",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
     etherscan: {
    apiKey: process.env.api,
  },
  mocha: {
    timeout: 400000000000000000
  }
}