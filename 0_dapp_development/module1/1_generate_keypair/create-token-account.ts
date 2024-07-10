import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
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

    const link = getExplorerLink(
        "address",
        tokenAccount.address.toBase58(),
        "devnet"
    );

    // https://explorer.solana.com/address/GLC9reWocDnwiawVUYAfkHQhBY8UMkgGs2GVhYStZ5VJ?cluster=devnet
    console.log("link: ", link);
}

start();
