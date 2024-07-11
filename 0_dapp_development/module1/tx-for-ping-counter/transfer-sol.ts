import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const keypair = getKeypairFromEnvironment("SECRET_KEY");

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const instruction = SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey("38jEaxphBTa3NEg4K6nG8Zgs6eVsSsr9AoSZCfax2pH8"),
        lamports: 0.001 * LAMPORTS_PER_SOL, // 0.001 SOL
    });
    let tx = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(connection, tx, [
        keypair,
    ]);

    console.log(
        "tx: ",
        getExplorerLink("transaction", signature.toString(), "devnet")
    );
    // https://explorer.solana.com/tx/atwHYjkx1hYZw4m1vdZUmb9Emp2Rj964FcoEB4JWrL9SYMtW2BsopQVamMQcd6vYrmidJY4iSdLvC4tZRJkq3JF?cluster=devnet
}

main();
