import { AccountLayout, getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export type TokenTypeForDisplay = "Token Program" | "Token Extensions Program";

export interface TokenInfoForDisplay {
    mint: PublicKey;
    amount: number;
    decimals: number;
    displayAmount: number;
    type: TokenTypeForDisplay;
}

export async function fetchTokenInfo(
    connection: Connection,
    owner: PublicKey,
    programId: PublicKey,
    type: TokenTypeForDisplay
): Promise<TokenInfoForDisplay[]> {
    const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
        programId,
    });

    console.log(tokenAccounts);

    const ownedTokens: TokenInfoForDisplay[] = [];

    for (const tokenAccount of tokenAccounts.value) {
        const accountData = AccountLayout.decode(tokenAccount.account.data);
        console.log("accountData:", accountData);

        const mintInfo = await getMint(
            connection,
            accountData.mint,
            connection.commitment,
            programId
        );

        ownedTokens.push({
            mint: accountData.mint,
            amount: Number(accountData.amount),
            decimals: mintInfo.decimals,
            displayAmount: Number(accountData.amount) / 10 ** mintInfo.decimals,
            type,
        });
    }
    return ownedTokens;
}
