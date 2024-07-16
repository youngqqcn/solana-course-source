import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
// import { AnchorAdminInstruction } from "../target/types/anchor_admin_instruction";
import fs from "fs";
import { assert, expect } from "chai";
import { AnchorAdminInstruction } from "../target/types/anchor_admin_instruction";
import { getKeypairFromFile } from "@solana-developers/helpers";

describe("anchor-admin-instruction", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor.AnchorProvider.env());
    anchor.setProvider(anchor.AnchorProvider.env());
    const connection = anchor.getProvider().connection;

    const program = anchor.workspace
        .AnchorAdminInstruction as Program<AnchorAdminInstruction>;

    const sender = anchor.web3.Keypair.generate();
    const receiver = anchor.web3.Keypair.generate();

    let feeDestination: anchor.web3.PublicKey;
    let senderTokenAccount: anchor.web3.PublicKey;
    let receiverTokenAccount: anchor.web3.PublicKey;

    const [programConfig] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("program_config")],
        program.programId
    );

    before(async () => {
        const wallet = await getKeypairFromFile(
            "/home/yqq/.config/solana/id.json"
        );

        let data = fs.readFileSync(
            "env9JiVQgUQMLt7Qekm8VEwyp2Wzds7ht7UpcmmiR1V.json"
        );

        let keypair = anchor.web3.Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(data.toString()))
        );

        const mint = await spl.createMint(
            connection,
            wallet,
            wallet.publicKey,
            null,
            0,
            keypair
        );

        feeDestination = await spl.createAccount(
            connection,
            wallet,
            mint,
            wallet.publicKey
        );

        senderTokenAccount = await spl.createAccount(
            connection,
            wallet,
            mint,
            sender.publicKey
        );

        receiverTokenAccount = await spl.createAccount(
            connection,
            wallet,
            mint,
            receiver.publicKey
        );

        await spl.mintTo(
            connection,
            wallet,
            mint,
            senderTokenAccount,
            wallet,
            10000
        );

        const transactionSignature = await connection.requestAirdrop(
            sender.publicKey,
            1 * anchor.web3.LAMPORTS_PER_SOL
        );

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();

        await connection.confirmTransaction(
            {
                blockhash,
                lastValidBlockHeight,
                signature: transactionSignature,
            },
            "confirmed"
        );
    });

    it("initialize ProgramConfig", async () => {
        // const wallet = await getKeypairFromFile(
        //     "/home/yqq/.config/solana/id.json"
        // );
        const tx = await program.methods
            .initializeProgramConfig()
            .accounts({
                feeDestination: feeDestination,
                authority: provider.wallet.publicKey,
            })
            .signers([])
            .rpc();

        assert.strictEqual(
            (
                await program.account.programConfig.fetch(programConfig)
            ).feeBasisPoints.toNumber(),
            100
        );
        assert.strictEqual(
            (
                await program.account.programConfig.fetch(programConfig)
            ).feeDestination.toBase58(),
            feeDestination.toBase58()
        );
        assert.strictEqual(
            (
                await program.account.programConfig.fetch(programConfig)
            ).admin.toBase58(),
            provider.wallet.publicKey.toBase58()
        );
    });

    it("Payment completes successfully", async () => {
        const tx = await program.methods
            .payment(new anchor.BN(10000))
            .accounts({
                // programConfig: programConfig,
                // feeDestination: feeDestination,
                senderTokenAccount: senderTokenAccount,
                receiverTokenAccount: receiverTokenAccount,
                sender: sender.publicKey,
            })
            .transaction();
        await anchor.web3.sendAndConfirmTransaction(connection, tx, [sender]);
        assert.strictEqual(
            (await connection.getTokenAccountBalance(senderTokenAccount)).value
                .uiAmount,
            0
        );
        assert.strictEqual(
            (await connection.getTokenAccountBalance(feeDestination)).value
                .uiAmount,
            100
        );
        assert.strictEqual(
            (await connection.getTokenAccountBalance(receiverTokenAccount))
                .value.uiAmount,
            9900
        );
    });

    it("update program config", async () => {
        console.log(
            "current admin: ",
            (
                await program.account.programConfig.fetch(programConfig)
            ).admin.toBase58()
        );
        let tx = await program.methods
            .updateProgramConfig(new anchor.BN(200))
            .accounts({
                admin: provider.publicKey,
                newAdmin: sender.publicKey,
                feeDestination: feeDestination,
            })
            .rpc();

        expect(
            (
                await program.account.programConfig.fetch(programConfig)
            ).admin.toBase58()
        ).to.equal(sender.publicKey.toBase58());
    });
});
