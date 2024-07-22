import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaPdaSharing } from "../target/types/solana_pda_sharing";
import { Keypair } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { assert, expect } from "chai";
import { getAccount } from "@solana/spl-token";

describe("solana-pda-sharing", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace
        .SolanaPdaSharing as Program<SolanaPdaSharing>;

    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = anchor.getProvider().connection;
    const wallet = anchor.workspace.SolanaPdaSharing.provider.wallet;
    const walletFake = Keypair.generate();

    const poolInsecure = Keypair.generate();
    const poolInsecureFake = Keypair.generate();

    const poolSecureFake = Keypair.generate();

    const vaultRecommended = Keypair.generate();

    let mint: anchor.web3.PublicKey;
    let vaultInsecure: spl.Account;
    let vaultSecure: spl.Account;
    let withdrawDestination: anchor.web3.PublicKey;
    let withdrawDestinationFake: anchor.web3.PublicKey;

    let authInsecure: anchor.web3.PublicKey;
    let authInsecureBump: number;

    let authSecure: anchor.web3.PublicKey;
    let authSecureBump: number;

    before(async () => {
        mint = await spl.createMint(
            connection,
            wallet.payer,
            wallet.publicKey,
            null,
            0
        );
        [authInsecure, authInsecureBump] =
            web3.PublicKey.findProgramAddressSync(
                [mint.toBuffer()],
                program.programId
            );

        vaultInsecure = await spl.getOrCreateAssociatedTokenAccount(
            connection,
            wallet.payer,
            mint,
            authInsecure,
            true
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

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(
                walletFake.publicKey,
                1 * anchor.web3.LAMPORTS_PER_SOL
            ),
            "confirmed"
        );
        [authSecure, authSecureBump] = web3.PublicKey.findProgramAddressSync(
            [withdrawDestination.toBuffer()],
            program.programId
        );

        vaultSecure = await spl.getOrCreateAssociatedTokenAccount(
            connection,
            wallet.payer,
            mint,
            authSecure,
            true
        );
    });

    it("Initialize Pool Insecure", async () => {
        await program.methods
            .initializePool(authInsecureBump)
            .accounts({
                pool: poolInsecure.publicKey,
                mint: mint,
                vault: vaultInsecure.address,
                withdrawDestination: withdrawDestination,
            })
            .signers([poolInsecure])
            .rpc();

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            vaultInsecure.address,
            wallet.payer,
            100
        );

        const account = await spl.getAccount(connection, vaultInsecure.address);
        expect(Number(account.amount)).to.equal(100);
    });

    it("Withdraw", async () => {
        await program.methods
            .withdrawInsecure()
            .accounts({
                pool: poolInsecure.publicKey,
                vault: vaultInsecure.address,
                withdrawDestination: withdrawDestination,
                authority: authInsecure,
            })
            .rpc();

        const account = await spl.getAccount(connection, vaultInsecure.address);
        expect(Number(account.amount)).to.equal(0);
    });

    it("Insecure initialize allows pool to be initialized with wrong vault", async () => {
        await program.methods
            .initializePool(authInsecureBump)
            .accounts({
                pool: poolInsecureFake.publicKey,
                mint: mint,
                vault: vaultInsecure.address,
                withdrawDestination: withdrawDestinationFake,
                payer: walletFake.publicKey,
            })
            .signers([walletFake, poolInsecureFake])
            .rpc();

        await new Promise((x) => setTimeout(x, 1000));

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            vaultInsecure.address,
            wallet.payer,
            100
        );

        const account = await spl.getAccount(connection, vaultInsecure.address);
        expect(Number(account.amount)).to.equal(100);
    });

    it("Insecure withdraw allows stealing from vault", async () => {
        await program.methods
            .withdrawInsecure()
            .accounts({
                pool: poolInsecureFake.publicKey,
                vault: vaultInsecure.address,
                withdrawDestination: withdrawDestinationFake,
                authority: authInsecure,
                signer: walletFake.publicKey, // 指定交易签名者
            })
            .signers([walletFake])
            .rpc();

        const account = await spl.getAccount(connection, vaultInsecure.address);
        expect(Number(account.amount)).to.equal(0);
    });

    it("Withdraw secure", async () => {
        // const withdrawDestinationAccount = await getAccount(
        //     provider.connection,
        //     withdrawDestination
        // );
        await program.methods
            .initializePoolSecure()
            .accounts({
                // pool: authSecure,
                mint: mint,
                withdrawDestination: withdrawDestination,
                payer: wallet.payer.publicKey,
                vault: vaultRecommended.publicKey,
            })
            .signers([vaultRecommended])
            .rpc();

        await new Promise((x) => setTimeout(x, 1000));

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            vaultRecommended.publicKey,
            wallet.payer,
            100
        );

        await program.methods
            .withdrawSecure()
            .accounts({
                pool: authSecure,
                vault: vaultRecommended.publicKey,
                withdrawDestination: withdrawDestination,
                // authority: authSecure,
            })
            .rpc();

        const account = await spl.getAccount(
            connection,
            vaultRecommended.publicKey
        );
        expect(Number(account.amount)).to.equal(0);
    });

    it("Disallow to other withdrawDestination", async () => {
        try {
            await spl.mintTo(
                connection,
                wallet.payer,
                mint,
                vaultRecommended.publicKey,
                wallet.payer,
                100
            );

            await program.methods
                .withdrawSecure()
                .accounts({
                    pool: authSecure,
                    vault: vaultRecommended.publicKey,
                    withdrawDestination: withdrawDestinationFake,
                })
                .rpc();
        } catch (error) {
            console.log(error);
            expect(error);
        }
    });

    it("Secure pool initialization doesn't allow wrong vault", async () => {
        try {
            await program.methods
                .initializePoolSecure()
                .accounts({
                    // pool: authSecure,
                    mint: mint,
                    vault: vaultInsecure.address,
                    withdrawDestination: withdrawDestination,
                })
                .signers([vaultRecommended])
                .rpc();

            assert.fail("expected error");
        } catch (error) {
            console.log(error.message);
            expect(error);
        }
    });
});
