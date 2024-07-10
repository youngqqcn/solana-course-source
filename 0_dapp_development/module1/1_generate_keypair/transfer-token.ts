import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import { getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import "dotenv/config";

async function start() {
    
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const sender = getKeypairFromEnvironment("SECRET_KEY");
    console.log("sender: ", sender.publicKey.toBase58());

    const tokenMintAccount = new PublicKey(
        "BSUk5iZYhBkELheMe1fLj32rk3cqDxfEk9jeYZrA83X9"
    );

    // 发送方ATA
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        sender,
        tokenMintAccount,
        sender.publicKey // recipient
    );

    console.log("sourceAccount: ", sourceTokenAccount.address.toBase58());

    // 接收方的ATA
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        sender,
        tokenMintAccount,
        new PublicKey("38jEaxphBTa3NEg4K6nG8Zgs6eVsSsr9AoSZCfax2pH8")
    );

    const txSignature = await transfer(
        connection,
        sender,
        sourceTokenAccount.address,
        destinationTokenAccount.address,
        sender,
        1 * Math.pow(10, 6)
    );

    let link = getExplorerLink("transaction", txSignature, "devnet");
    console.log("link: ", link);
}

start();
