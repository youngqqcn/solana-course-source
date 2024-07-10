import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import { createMint } from "@solana/spl-token";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import "dotenv/config";

async function start() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const sender = getKeypairFromEnvironment("SECRET_KEY");
    console.log("sender: ", sender.publicKey.toBase58());

    let tokenMint = await createMint(
        connection,
        sender,
        sender.publicKey,
        sender.publicKey,
        6
    );

    const explorerLink = getExplorerLink(
        "address",
        tokenMint.toString(),
        "devnet"
    );
    console.log("explorerLink: ", explorerLink);
}

start();
