import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaReinitializationAttacks } from "../target/types/solana_reinitialization_attacks";
import { expect } from "chai";

describe("solana-reinitialization-attacks", () => {
    // Configure the client to use the local cluster.

    const program = anchor.workspace
        .SolanaReinitializationAttacks as Program<SolanaReinitializationAttacks>;

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const wallet =
        anchor.workspace.SolanaReinitializationAttacks.provider.wallet;

    const walletTwo = anchor.web3.Keypair.generate();

    const userInsecure = anchor.web3.Keypair.generate();
    const userRecommended = anchor.web3.Keypair.generate();

    before(async () => {
        const tx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: userInsecure.publicKey,
                space: 32,
                lamports:
                    await provider.connection.getMinimumBalanceForRentExemption(
                        32
                    ),
                programId: program.programId,
            })
            // anchor.web3.SystemProgram.createAccount({
            //     fromPubkey: wallet.publicKey,
            //     newAccountPubkey: userRecommended.publicKey,
            //     space: 32,
            //     lamports:
            //         await provider.connection.getMinimumBalanceForRentExemption(
            //             32
            //         ),
            //     programId: program.programId,
            // }),
        );

        await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [
            wallet.payer,
            userInsecure,
            // userRecommended
        ]);

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(
                walletTwo.publicKey,
                1 * anchor.web3.LAMPORTS_PER_SOL
            ),
            "confirmed"
        );
    });

    it("Insecure init", async () => {
        await program.methods
            .insecureInitialization()
            .accounts({
                user: userInsecure.publicKey,
            })
            .rpc();
    });

    it("Re-invoke insecure init with different auth", async () => {
        const tx = await program.methods
            .insecureInitialization()
            .accounts({
                user: userInsecure.publicKey,
                authority: walletTwo.publicKey,
            })
            .transaction();
        await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [
            walletTwo,
        ]);
    });

    it("Secure init ", async () => {
        await program.methods
            .secureInitialization()
            .accounts({
                user: userRecommended.publicKey,
            })
            .signers([userRecommended])
            .rpc();
    });

    it("Re-invoke secure init with different auth", async () => {
        try {
            const tx = await program.methods
                .secureInitialization()
                .accounts({
                    user: userRecommended.publicKey,
                    authority: walletTwo.publicKey,
                })
                .transaction();
            await anchor.web3.sendAndConfirmTransaction(
                provider.connection,
                tx,
                [walletTwo, userRecommended]
            );
        } catch (error: any) {
            expect(error.message).to.contains("already in use");
            // console.error(error);
        }
    });
});
