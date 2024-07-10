import { getKeypairFromEnvironment } from "@solana-developers/helpers";
import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";

import "dotenv/config";

async function start() {
    let inputToPubKey = process.argv[2] || null; //

    if (!inputToPubKey) {
        console.error("plase input pubkey to receive SOL");
        process.exit(1);
    }

    const senderKeypair = getKeypairFromEnvironment("SECRET_KEY");
    console.log("sender: ", senderKeypair.publicKey.toBase58());

    const toPubkey = new PublicKey(inputToPubKey);
    console.log("receiver:", toPubkey.toBase58());

    const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed" // 关于这个commitment，可以看https://solana.com/docs/advanced/confirmation#fetch-blockhashes-with-the-appropriate-commitment-level
    );

    // 获取最新区块
    const blockhash = await connection.getLatestBlockhash("processed");
    console.log("blockhash: ", blockhash);

    // 创建交易

    let transaction = new Transaction();
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: toPubkey,
            lamports: 0.001 * LAMPORTS_PER_SOL, // 0.001 SOL
        })
    );

    // 发送交易获取交易hash
    const signature = await sendAndConfirmTransaction(connection, transaction, [
        senderKeypair,
    ]);

    console.log("signature: ", signature);

    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

start();
