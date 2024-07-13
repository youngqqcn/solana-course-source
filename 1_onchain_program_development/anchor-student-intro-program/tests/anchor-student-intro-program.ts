import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorStudentIntroProgram } from "../target/types/anchor_student_intro_program";
import { expect } from "chai";

describe("anchor-student-intro-program", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
        .AnchorStudentIntroProgram as Program<AnchorStudentIntroProgram>;

    const stuIntro = {
        name: "Alice",
        intro: "intro",
    };

    const [studentPda, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(stuIntro.name), provider.wallet.publicKey.toBytes()],
        program.programId
    );

    it("create student intro", async () => {
        // Add your test here.
        const tx = await program.methods
            .createStudentIntro(stuIntro.name, stuIntro.intro)
            .rpc();

        let studentIntroAccount = await program.account.studentIntroState.fetch(
            studentPda
        );

        expect(studentIntroAccount.intro, stuIntro.intro);
        expect(studentIntroAccount.name, stuIntro.name);
    });

    it("update student intro", async () => {
        await program.methods.updateStudentIntro("updated name", "new intro");

        let stuAcc = await program.account.studentIntroState.fetch(studentPda);

        expect(stuAcc.name, stuIntro.name);
        expect(stuAcc.intro, stuIntro.intro);
    });
});
