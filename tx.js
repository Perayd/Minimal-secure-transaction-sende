// send_tx.js
// Usage: NODE_ENV=production PRIVATE_KEY="0x..." RPC_URL="https://rpc..." node send_tx.js

const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY; // read from env (do NOT commit!)
  if (!rpcUrl || !privateKey) throw new Error("Set RPC_URL and PRIVATE_KEY env vars.");

  // Provider (connect to the EVM network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Wallet created locally (offline signing). For hardware wallet, use a different signer.
  const wallet = new ethers.Wallet(privateKey, provider);

  // Targets and amounts
  const to = "0xReceiverAddressHere";          // replace
  const value = ethers.parseEther("0.01");    // 0.01 native token (ETH/BNB/MATIC...)

  // Prevent replay across chains by ensuring correct chainId is used
  const network = await provider.getNetwork(); // returns { chainId, name, ... }
  console.log("Connected network:", network);

  // Build transaction skeleton
  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  const feeData = await provider.getFeeData(); // may include baseFee, maxFeePerGas, maxPriorityFeePerGas

  // Use EIP-1559 if supported
  const tx = {
    to,
    value,
    nonce,
    // If chain uses EIP-1559 (most modern chains), prefer these fields
    maxFeePerGas: feeData.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
    // fallback for legacy gasPrice chains
    gasPrice: feeData.gasPrice ?? undefined,
    chainId: network.chainId,
    // gasLimit: you can estimate below
  };

  // Estimate gasLimit for added safety
  const estimated = await provider.estimateGas({ ...tx, from: wallet.address });
  // Add a small buffer
  tx.gasLimit = estimated.add(ethers.BigInt(Math.floor(estimated.toString() * 0.1) || 10000)); // ~10% buffer

  console.log("Tx skeleton:", {
    to: tx.to,
    value: tx.value.toString(),
    nonce: tx.nonce,
    chainId: tx.chainId,
    gasLimit: tx.gasLimit.toString(),
  });

  // Sign & send transaction (offline signing happens inside sendTransaction)
  const sent = await wallet.sendTransaction(tx);
  console.log("Sent tx hash:", sent.hash);

  // Wait for confirmations: for high value, wait for more confirmations (e.g., 6)
  const confirmationsToWait = 3;
  const receipt = await provider.waitForTransaction(sent.hash, confirmationsToWait, 60_000 * 5); // timeout 5 min
  if (!receipt) throw new Error("No receipt (timeout).");

  console.log("Receipt:", {
    blockNumber: receipt.blockNumber,
    confirmations: receipt.confirmations,
    status: receipt.status, // 1 = success, 0 = revert
    gasUsed: receipt.gasUsed && receipt.gasUsed.toString(),
  });

  if (receipt.status !== 1) {
    throw new Error("Transaction failed (status != 1).");
  }

  console.log("Transaction confirmed ✅");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
