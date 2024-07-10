import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
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
} from "@solana/web3.js";
import "dotenv/config";

async function start() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const sender = getKeypairFromEnvironment("SECRET_KEY");
    console.log("sender: ", sender.publicKey.toBase58());

    // https://explorer.solana.com/address/metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s?cluster=devnet
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const tokenMintAccount = new PublicKey(
        "BSUk5iZYhBkELheMe1fLj32rk3cqDxfEk9jeYZrA83X9"
    );

    const metedata = {
        name: "YQQ Solana Token",
        symbol: "YST",
        decimals: 6,
        image: "",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
        // Arweave / IPFS / Pinata etc link using metaplex standard for off-chain data
        uri: "https://ipfs.io/ipfs/QmYe66u9pPkDDFR64iRTWJni3vuWirobkb4BZvJmJmQxWx",
        url: "https://qiyichain.cn",
    };

    const [metadataPDA, bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"), // 固定的
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            tokenMintAccount.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );

    const transaction = new Transaction().add(
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: tokenMintAccount,
                mintAuthority: sender.publicKey,
                payer: sender.publicKey,
                updateAuthority: sender.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    collectionDetails: null,
                    data: metedata,
                    isMutable: true,
                },
            }
        )
    );

    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [sender]
    );

    const txExplorerLink = getExplorerLink(
        "transaction",
        transactionSignature.toString(),
        "devnet"
    );
    console.log("tx: ", txExplorerLink);

    const tokenMintAccountLink = getExplorerLink(
        "address",
        tokenMintAccount.toString(),
        "devnet"
    );
    console.log("tokenMint: ", tokenMintAccountLink);

    // https://explorer.solana.com/address/BSUk5iZYhBkELheMe1fLj32rk3cqDxfEk9jeYZrA83X9/metadata?cluster=devnet
}

start();
