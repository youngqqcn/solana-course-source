import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const keypair = getKeypairFromEnvironment("SECRET_KEY");

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const PING_PROGRAM_ADDRESS = new PublicKey(
        "ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa"
    );
    const PING_PROGRAM_DATA_ADDRESS = new PublicKey(
        "Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod"
    );

    const instruction = new TransactionInstruction({
        keys: [
            {
                pubkey: PING_PROGRAM_DATA_ADDRESS,
                isSigner: false,
                isWritable: true,
            },
        ],
        programId: PING_PROGRAM_ADDRESS,
    });
    let tx = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(connection, tx, [
        keypair,
    ]);

    console.log(
        "tx: ",
        getExplorerLink("transaction", signature.toString(), "devnet")
    );
    // https://explorer.solana.com/tx/2jPAq4UCUMUTCj9NTkhQtyCJccfziwbkquXu5hjJGmqPWQp4B3FQcHyVXotvveXjPQepVUauf7JqjpaJKMeSk3s6?cluster=devnet
}

main();
