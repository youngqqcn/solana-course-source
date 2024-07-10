import { getKeypairFromEnvironment } from "@solana-developers/helpers";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import "dotenv/config";

async function start() {
    const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
    );

    // const keypair = getKeypairFromEnvironment("SECRET_KEY");

    // let pubkey = keypair.publicKey;
    // console.log("pubkey: " + pubkey);

    // 如果有从控制台输入, 查询输入的， 否则直接查询 .env 文件中的地址
    let supplyPubKey = process.argv[2];
    console.log("supplyPubKey: " + supplyPubKey);
    if (!supplyPubKey) {
        console.log("please provide a public key as args");
        return;
    }
    try {
        let pubkey = new PublicKey(supplyPubKey);

        let balanceInLamports = await connection.getBalance(pubkey);

        let balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;

        console.log("lamports = ", balanceInLamports);
        console.log("balanceInSOL = ", balanceInSOL);
    } catch (e) {
        console.log("Error: ", e.message);
    }
}

start();
