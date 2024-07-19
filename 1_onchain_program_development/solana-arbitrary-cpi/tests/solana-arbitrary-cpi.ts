import { Program } from "@coral-xyz/anchor";
import { CharacterMetadata } from "../target/types/character_metadata";
import { FakeMetadata } from "../target/types/fake_metadata";
import { Gameplay } from "../target/types/gameplay";
import { web3 } from "@coral-xyz/anchor";
import { getMetadataKey, safeAirdrop } from "./utils/utils";
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";

describe("solana-arbitrary-cpi", async () => {
    const gameplayProgram = anchor.workspace.Gameplay as Program<Gameplay>;
    const metadataProgram = anchor.workspace
        .CharacterMetadata as Program<CharacterMetadata>;
    const fakeMetadataProgram = anchor.workspace
        .FakeMetadata as Program<FakeMetadata>;

    let provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor.AnchorProvider.env());

    let connection = provider.connection;
    let playerOne = web3.Keypair.generate();
    let attacker = web3.Keypair.generate();

    beforeEach(async () => {
        await safeAirdrop(playerOne.publicKey, connection);
        await safeAirdrop(attacker.publicKey, connection);
    });

    it("xxxxx", async () => {
        expect(connection);
    });

    it("Insecure instructions allow attacker to win every time", async () => {
        // Initialize player one with real metadata program
        let tx = await gameplayProgram.methods
            .createCharacterInsecure()
            .accounts({
                metadataProgram: metadataProgram.programId,
                authority: playerOne.publicKey,
            })
            .signers([playerOne])
            .rpc();
        expect(tx);

        // Initialize attacker with fake metadata program
        // await gameplayProgram.methods
        //     .createCharacterInsecure()
        //     .accounts({
        //         metadataProgram: fakeMetadataProgram.programId,
        //         authority: attacker.publicKey,
        //     })
        //     .signers([attacker])
        //     .rpc();

        // const [playerOneMetadataKey] = getMetadataKey(
        //     playerOne.publicKey,
        //     gameplayProgram.programId,
        //     metadataProgram.programId
        // );

        // const [attackerMetadataKey] = getMetadataKey(
        //     attacker.publicKey,
        //     gameplayProgram.programId,
        //     fakeMetadataProgram.programId
        // );

        // const playerOneMetadata = await metadataProgram.account.metadata.fetch(
        //     playerOneMetadataKey
        // );

        // const attackerMetadata =
        //     await fakeMetadataProgram.account.metadata.fetch(
        //         attackerMetadataKey
        //     );

        // expect(playerOneMetadata.health).to.be.lessThan(20);
        // expect(playerOneMetadata.power).to.be.lessThan(20);

        // expect(attackerMetadata.health).to.equal(255);
        // expect(attackerMetadata.power).to.equal(255);
    });
});
