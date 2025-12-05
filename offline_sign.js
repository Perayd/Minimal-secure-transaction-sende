// offline_sign.js
const { ethers } = require("ethers");

async function offlineSign() {
  const privateKey = process.env.PRIVATE_KEY; // on air-gapped machine
  const providerRpcForMeta = process.env.RPC_URL_META; // a provider used only to fetch nonce, chainId, fee estimates; can be separate
  const provider = new ethers.JsonRpcProvider(providerRpcForMeta);
  const wallet = new ethers.Wallet(privateKey); // not connected to provider

  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  const feeData = await provider.getFeeData();

  const tx = {
    to: "0xReceiver...",
    value: ethers.parseEther("0.005"),
    nonce,
    chainId: (await provider.getNetwork()).chainId,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    gasLimit: await provider.estimateGas({ to: "0xReceiver...", from: wallet.address, value: ethers.parseEther("0.005") })
  };

  // Sign locally (returns serialized signed tx)
  const signed = await wallet.signTransaction(tx);
  console.log("Signed tx (paste to broadcaster):", signed);
}
offlineSign();
