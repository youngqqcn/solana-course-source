import {
    airdropIfRequired,
    initializeKeypair,
} from "@solana-developers/helpers";
import {
    createMint,
    getMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";
import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
} from "@solana/web3.js";

export async function createAndMintToken(
    connection: Connection,
    tokenProgramId: PublicKey,
    payer: Keypair,
    decimals: number,
    mintAmount: number
): Promise<PublicKey> {
    // create mint
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        decimals,
        undefined,
        { commitment: connection.commitment },
        tokenProgramId
    );

    const mintInfo = await getMint(
        connection,
        mint,
        connection.commitment,
        tokenProgramId
    );
    console.log(mintInfo);

    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        true,
        connection.commitment,
        { commitment: connection.commitment },
        tokenProgramId
    );

    const sig = await mintTo(
        connection,
        payer,
        mint,
        ata.address,
        payer,
        mintAmount,
        [payer],
        {
            commitment: connection.commitment,
        },
        tokenProgramId
    );

    console.log(sig);

    return mint;
}

// export default createAndMintToken;
