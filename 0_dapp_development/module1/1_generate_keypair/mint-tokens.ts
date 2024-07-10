import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import "dotenv/config";

async function start() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const sender = getKeypairFromEnvironment("SECRET_KEY");
    console.log("sender: ", sender.publicKey.toBase58());

    const tokenMintAccount = new PublicKey(
        "BSUk5iZYhBkELheMe1fLj32rk3cqDxfEk9jeYZrA83X9"
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        sender,
        tokenMintAccount,
        sender.publicKey // recipient
    );

    console.log("tokenAccount: ", tokenAccount.address.toBase58());

    let transactionSignature = await mintTo(
        connection,
        sender,
        tokenMintAccount,
        tokenAccount.address,
        sender.publicKey,
        10 * Math.pow(10, 6)
    );

    let link = getExplorerLink("transaction", transactionSignature, "devnet");
    console.log("link: ", link);
    // https://explorer.solana.com/tx/2DuH3iFgxS3BxsZtmD1iFeEdpb7Wyrr7soxDH58iuHD7jRhTsStrfj1w5UUohC6N5PkGMzipp5KAUARdSmWS7Se7?cluster=devnet
}

start();
