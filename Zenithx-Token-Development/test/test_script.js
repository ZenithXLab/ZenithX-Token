const { ethers } = require("hardhat");
const { signERC2612Permit } = require('eth-permit');
const { expect } = require("chai");
const { stringify } = require("qs");
const { BigNumber } = ethers;
require('dotenv').config({path:".env"});

describe('ZenithX Token', () => {
    let owner;
    let user1;
    let user2;
    let user3;
    let user4;
    let zenithX;
    let rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545/"; //BSC Testnet RPC URL for testing.
    const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);


    beforeEach(async () => {
            [owner] = await ethers.getSigners();
        user1 = new ethers.Wallet(process.env.privatekey1, ethers.provider); // Replace with the private key of user1
        user2 = new ethers.Wallet(process.env.privatekey2, ethers.provider); // Replace with the private key of user2
        user3 = new ethers.Wallet(process.env.privatekey3, ethers.provider); // Replace with the private key of user3
        user4 = new ethers.Wallet(process.env.privatekey4, ethers.provider); // Replace with the private key of user4

        const ZenithX = await ethers.getContractFactory('ZenithX');
const routeraddress="0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
const owner_address = await owner.getAddress();
       

zenithX = await ZenithX.deploy(owner_address, routeraddress, { gasLimit: 6000000 });


    });

    it('Should deploy the contract and set the initial values', async () => {

        expect(await zenithX.name()).to.equal('ZenithX');
        expect(await zenithX.symbol()).to.equal('ZNX');
        expect(await zenithX.decimals()).to.equal(18);
        // let expectedValue = BigInt(10000000000) * BigInt(10 ** 18);
        let expectedValue = BigInt(350000000) * BigInt(10 ** 18);
        console.log("expectedValue",expectedValue);
        console.log("totalsupply",await zenithX.totalSupply());

        expect(await zenithX.totalSupply()).to.equal(expectedValue);
        expect(await zenithX.balanceOf(await owner.getAddress())).to.equal(expectedValue);
        expect(await zenithX.owner()).to.equal(await owner.getAddress());
    });


    it('Should allow transferring tokens between accounts', async () => {
        const amountToTransfer = ethers.utils.parseUnits("1", "18");

        const tx=    await zenithX.connect(owner).transfer(await user1.getAddress(), amountToTransfer);
        await tx.wait();
        console.log(await zenithX.balanceOf(await user1.getAddress()),amountToTransfer, "user1Blance");
        expect(await zenithX.balanceOf(await user1.getAddress())).to.equal(amountToTransfer);
    });


    it('Should permit the owner to change ownership', async () => {
        // Get the address of user1
        const newOwner = await user1.getAddress();

        // Log the current owner's address before the ownership transfer
        console.log("Current owner:", await zenithX.owner());
        console.log("Current owner:", newOwner);


        // Transfer ownership from the current owner to user1
        const tx=    await zenithX.connect(owner).transferOwnership(newOwner);
        await tx.wait();

        // Log the new owner's address after the ownership transfer
        console.log("New owner:", await zenithX.owner());

        // Check if the ownership transfer was successful
        expect(await zenithX.owner()).to.equal(newOwner);
    });


    it('Should permit token approval and transferFrom', async () => {
         const amountToApprove1 = ethers.utils.parseUnits("1", "18");
         const amountToApprove2 = ethers.utils.parseUnits("4", "18");
        console.log("amountForAllowance",amountToApprove1)
         // Owner approves user1 to spend tokens
        const spender = await user1.getAddress();
        const tx = await zenithX.connect(owner).approve(spender, amountToApprove1, {gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price accordingly
        });
        await tx.wait();
        console.log("allowance",await zenithX.allowance(await owner.getAddress(), spender))
        console.log("amountForAllowance",amountToApprove1)
        console.log(user1.getAddress(),"user1");
        console.log(user2.getAddress(),"user1");
        console.log(user3.getAddress(),"user1");
        console.log(user4.getAddress(),"user1");

        expect(await zenithX.allowance(await owner.getAddress(), spender)).to.equal(amountToApprove1);
        console.log("amountForAllowance0",amountToApprove1)

         // User1 transfers tokens to user2 using transferFrom
        const tx1=        await zenithX.connect(user1).transferFrom(await owner.getAddress(), await user2.getAddress(), amountToApprove1, {
        gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price accordingly
        });
        await tx1.wait();
        expect(await zenithX.balanceOf(await user2.getAddress())).to.equal(amountToApprove1);
        console.log("amountForAllowance00",amountToApprove1)

         // Owner transfer token to user3
        const tx2=        await zenithX.connect(owner).transfer(await user3.getAddress(), ethers.utils.parseUnits("5", "18"), {
        gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price accordingly
        });
        await tx2.wait();
        console.log("amountForAllowance000",amountToApprove1)


        // User3 approves user4 to spend tokens
        const tx3=        await zenithX.connect(user3).approve(await user4.getAddress(), amountToApprove2, {
        gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
        });
        await tx3.wait();
        expect(await zenithX.allowance(await user3.getAddress(), await user4.getAddress())).to.equal(amountToApprove2);
        console.log("amountForAllowance0000",amountToApprove1)

         // User4 transfers tokens to user3 using transferFrom
        const tx4= await zenithX.connect(user4).transferFrom(await user3.getAddress(), await user2.getAddress(), amountToApprove2, {
        gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
        });
        await tx4.wait();
        expect(await zenithX.balanceOf(await user2.getAddress())).to.equal(ethers.utils.parseUnits("5", "18"));
        console.log("amountForAllowance000000",amountToApprove1)

         // Check balance of user3 because 1 ZNX gonna left
        expect(await zenithX.balanceOf(await user3.address)).to.equal(ethers.utils.parseUnits("1", "18"));
    });

    it('Should permit token approval and permit', async () => {
        const signerWallet = new ethers.Wallet(process.env.privatekey1, rpcProvider); //Wallet object of signer who will give allowance.
        const signerAddress = await signerWallet.getAddress();
        console.log("Signer Address: ", signerAddress);

        const spender = await user2.getAddress();
        console.log("spender: ", spender);
            //const value = ethers.utils.parseEther("1000"); // Permitted amount to spend
            const value = 1000;
console.log(signerWallet, zenithX.address, signerAddress, spender, value,"here");
    const allowanceParameters = await signERC2612Permit(signerWallet, zenithX.address, signerAddress, spender, value); // Sign operation
    console.log(allowanceParameters, "allowance Parameter");

    const execution = await zenithX.connect(signerWallet).permit(
        signerAddress,
        spender,
        value,
        allowanceParameters.deadline,
        allowanceParameters.v,
        allowanceParameters.r,
        allowanceParameters.s,
        {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        }
    );

    // Add an expectation to check the allowance after the permit
    expect(await zenithX.allowance(await user1.getAddress(), spender)).to.equal(value);
});

    it('Should permit token approval and permit and transferFrom', async () => {
        const signerWallet = new ethers.Wallet(process.env.privatekey, rpcProvider); //Wallet object of signer who will give allowance.
        const signerAddress = await signerWallet.getAddress();
        console.log("Signer Address: ", signerAddress);

        const spender = await user2.getAddress();
        console.log("spender: ", spender);
            const value = ethers.utils.parseEther("1000"); // Permitted amount to spend
            // const value = 1000;
    console.log(signerWallet, zenithX.address, signerAddress, spender, value,"here");
    const allowanceParameters = await signERC2612Permit(signerWallet, zenithX.address, signerAddress, spender, value); // Sign operation
    console.log(allowanceParameters, "allowance Parameter");

    const execution = await zenithX.connect(signerWallet).permit(
        signerAddress,
        spender,
        value,
        allowanceParameters.deadline,
        allowanceParameters.v,
        allowanceParameters.r,
        allowanceParameters.s,
        {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        }
    );
            console.log("fist");
            // const newValue = ethers.parseUnits(value,"18");

            const tx1=        await zenithX.connect(user2).transferFrom(signerAddress, spender, value, {
    gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
    });
            await tx1.wait();
                        console.log("fistsss");


    // Add an expectation to check the allowance after the permit
    expect(await zenithX.balanceOf(spender)).to.equal(value);
    });

    it('Should allow burning tokens by the owner', async () => {
         const amountToBurn = ethers.utils.parseUnits("0.01", "18");

         const tx = await zenithX.connect(owner).burn(amountToBurn);
         await tx.wait();
        expect(await zenithX.balanceOf(await owner.getAddress())).to.equal(ethers.utils.parseUnits("349999999.99", "18"), {
             gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
           });
     });

    it('Should allow burning tokens by the owner using burnFrom', async () => {
        const amountToApprove = ethers.utils.parseUnits("1000000", "18");
        const amountToBurn = ethers.utils.parseUnits("1000000", "18");

        // Owner approves user1 to spend tokens
        const tx = await zenithX.connect(owner).approve(await user2.getAddress(), amountToApprove, {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
          await tx.wait();
        const owner_address = await owner.getAddress();
               console.log("address :",user2.getAddress(),owner_address);
        console.log("owner address: ",  owner_address);
        const owner_balance = await zenithX.balanceOf(owner_address);
        const String_balance = owner_balance.toString();
        //console.log(ethers.utils.parseEther(owner_balance), "18");
        console.log("Wallet balance: ", ethers.utils.parseUnits(String_balance, "18"));
        const new_owner_balance = ethers.utils.parseUnits(String_balance, "18");
        
        // User1 burns tokens on behalf of the owner
     const tx1=   await zenithX.connect(user2).burnFrom(await owner.getAddress(), amountToBurn, {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
        await tx1.wait();
        const updated_owner_balance = await zenithX.balanceOf(owner_address);
        const updated_String_balance = updated_owner_balance.toString();
        //console.log(ethers.utils.parseEther(owner_balance), "18");
        const update_new_owner_balance =ethers.utils.parseUnits(updated_String_balance, "18");
        console.log("Wallet balance: ", ethers.utils.parseUnits(amountToApprove.toString(), "18"));
        expect(update_new_owner_balance ).to.equal(update_new_owner_balance);
    });

    it('Should not allow burning more tokens than the balance', async () => {
        const amountToBurn = ethers.utils.parseUnits("360000000", "18");

        // Attempt to burn more tokens than the balance, expecting it to revert with an error
        await expect(zenithX.connect(owner).burn(amountToBurn)).to.be.reverted;
    });

    it('Should not allow burning more tokens than allowed by allowance', async () => {
        const amountToApprove = ethers.utils.parseUnits("0.01", "18");
        const amountToBurn = ethers.utils.parseUnits("1", "18");

        // Owner approves user1 to spend tokens
        const tx = await zenithX.connect(owner).approve(await user1.getAddress(), amountToApprove, {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
        await tx.wait();
        // Attempt to burn more tokens than allowed by allowance, expecting it to revert with an error
        await expect(zenithX.connect(user1).burnFrom(await owner.getAddress(), amountToBurn)).to.be.reverted;
    });

    it('Should burn the amount at transferFrom', async () => {
        const amountToTransfer = ethers.utils.parseUnits("1", "18");
        const amountToApprove = ethers.utils.parseUnits("1", "18");
        const initialUser1Balance = await zenithX.balanceOf(await owner.getAddress());
        console.log(await owner.getAddress(), {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
        console.log("Amount to transfer: ", amountToTransfer);
        console.log("initial user Balance: ", initialUser1Balance);
        // Assuming you have set burning to true before this test
        const tx2 = await zenithX.connect(owner).enableBurning({
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
        await tx2.wait();
        //console.log(tx2);

        const tx = await zenithX.connect(owner).approve(await user1.getAddress(), amountToApprove, {
            gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
          });
          await tx.wait();
         // console.log(tx);
        const tx1 = await zenithX.connect(user1).transferFrom(
            await owner.getAddress(),
            await user1.getAddress(), // Replace with the recipient's address
            amountToTransfer, {
                gasPrice: ethers.utils.parseUnits('100', 'gwei'), // Adjust the gas price accordingly
              }
        );
    
        await tx1.wait();
       // console.log(tx1);
        const finalUser1Balance = await zenithX.balanceOf(await user1.getAddress());
        console.log(finalUser1Balance);
        const finalOwnerBalance = await zenithX.balanceOf(await owner.getAddress());
        // Calculate the expected burn amount
        const expectedBurnAmount = (amountToTransfer.mul(await zenithX.burnFee())).div(await zenithX.fee_denominator());
    
        // Calculate the expected balance after burn
        const expectedFinalBalance = initialUser1Balance.sub(expectedBurnAmount.add(finalUser1Balance));
        
        // Check if the burn amount is deducted and the balance is correct
        expect(finalOwnerBalance).to.equal(expectedFinalBalance);
    }); 

    
    

});
