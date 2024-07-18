import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorAccountDataMatching } from "../target/types/anchor_account_data_matching";
import * as spl from "@solana/spl-token";
import { expect } from "chai";

describe("anchor-account-data-matching", () => {
    // Configure the client to use the local cluster.

    const program = anchor.workspace
        .AnchorAccountDataMatching as Program<AnchorAccountDataMatching>;

    anchor.setProvider(anchor.AnchorProvider.env());

    const connection = anchor.getProvider().connection;
    const wallet = anchor.workspace.AnchorAccountDataMatching.provider.wallet;
    const walletFake = anchor.web3.Keypair.generate();

    const [vaultPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );

    const [tokenPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("token")],
        program.programId
    );

    let mint: anchor.web3.PublicKey;
    let withdrawDestination: anchor.web3.PublicKey;
    let withdrawDestinationFake: anchor.web3.PublicKey;

    before(async () => {
        mint = await spl.createMint(
            connection,
            wallet.payer,
            wallet.publicKey,
            null,
            0
        );

        withdrawDestination = await spl.createAccount(
            connection,
            wallet.payer,
            mint,
            wallet.publicKey
        );

        withdrawDestinationFake = await spl.createAccount(
            connection,
            wallet.payer,
            mint,
            walletFake.publicKey
        );

        await connection.confirmTransaction(
            await connection.requestAirdrop(
                walletFake.publicKey,
                1 * anchor.web3.LAMPORTS_PER_SOL
            ),
            "confirmed"
        );
    });

    it("Initialize Vault", async () => {
        await program.methods
            .initializeVault()
            .accounts({
                // vault: vaultPDA,
                // tokenAccount: tokenPDA,
                withdrawDestination: withdrawDestination,
                mint: mint,
                authority: wallet.publicKey,
            })
            .rpc();

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100
        );

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(100);
    });

    it("inscure withdraw", async () => {
        let tx = await program.methods
            .insecureWithdraw()
            .accounts({
                withdrawDestination: withdrawDestinationFake,
                authority: walletFake.publicKey,
            })
            .transaction();

        await web3.sendAndConfirmTransaction(connection, tx, [walletFake]);

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(0);
    });

    it("secure withdraw expect ok", async () => {
        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100,
            [],
            {
                maxRetries: 1000,
                commitment: "confirmed",
            }
        );

        let txid = await program.methods
            .secureWithdraw()
            .accounts({
                vault: vaultPDA,
                withdrawDestination: withdrawDestination,
                authority: wallet.publicKey,
                tokenAccount: tokenPDA,
            })
            .rpc();

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(0);
    });

    it("secure withdraw expect fail", async () => {
        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100,
            [],
            {
                maxRetries: 1000,
                commitment: "confirmed",
            }
        );

        try {
            let tx = await program.methods
                .secureWithdraw()
                .accounts({
                    vault: vaultPDA,
                    withdrawDestination: withdrawDestinationFake,
                    authority: walletFake.publicKey,
                    tokenAccount: tokenPDA,
                }).transaction();

            await web3.sendAndConfirmTransaction(connection, tx, [walletFake]);
        } catch (error) {
            expect(error);
            console.error(error);
        }
    });
});
