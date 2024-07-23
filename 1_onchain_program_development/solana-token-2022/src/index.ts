import { initializeKeypair } from "@solana-developers/helpers";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { createAndMintToken } from "./create-and-mint-token";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { fetchTokenInfo, TokenInfoForDisplay } from "./fetch-token-info";
import printTableData from "./print-helper";

(async () => {
    /**
     * Create a connection and initialize a keypair if one doesn't already exists.
     * If a keypair exists, airdrop a sol if needed.
     */

    // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const connection = new Connection("http://127.0.0.1:8899", {
        commitment: "confirmed",
    });
    const payer = await initializeKeypair(connection);

    // console.log(await connection.getBlockHeight());

    const mint1 = createAndMintToken(
        connection,
        TOKEN_PROGRAM_ID,
        payer,
        0,
        100000
    );

    const mint = await createAndMintToken(
        connection,
        TOKEN_2022_PROGRAM_ID,
        payer,
        0,
        1000
    );

    console.log(mint.toBase58());

    const myTokens: TokenInfoForDisplay[] = [];

    myTokens.push(
        ...(await fetchTokenInfo(
            connection,
            payer.publicKey,
            TOKEN_PROGRAM_ID,
            "Token Program"
        )),
        ...(await fetchTokenInfo(
            connection,
            payer.publicKey,
            TOKEN_2022_PROGRAM_ID,
            "Token Extensions Program"
        ))
    );

    printTableData(myTokens);
})();
