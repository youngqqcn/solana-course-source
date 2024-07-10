import { getKeypairFromEnvironment } from "@solana-developers/helpers";
import { Keypair } from "@solana/web3.js";
import "dotenv/config"

// 生成新的keypair
const keypair = Keypair.generate();
console.log("public key: ", keypair.publicKey.toBase58());
console.log("private key: ", keypair.secretKey);

// 从.env中加载已有的keypair
const keypair_local = getKeypairFromEnvironment("SECRET_KEY");
console.log("local public key: ", keypair_local.publicKey.toBase58());
console.log("local private key: ", keypair_local.secretKey);

