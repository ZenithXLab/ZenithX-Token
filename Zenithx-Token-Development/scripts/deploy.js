const {ethers} = require("hardhat");
async function main() {
    const [owner] = await ethers.getSigners();
      console.log("Owner Address:" , owner.address);
  const ZenithContract = await ethers.getContractFactory("ZenithX");
  const deployContract = await ZenithContract.deploy(owner.address,{ gasLimit: 6000000 });

  await deployContract.deployed();
  console.log("Contract Address:" , deployContract.address);
}

main() 
  .then(()=>process.exit(0))
  .catch((err)=>{
    console.error(err);
    process.exit(1);
  });
