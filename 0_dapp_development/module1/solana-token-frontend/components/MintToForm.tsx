import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import {
    createMintToInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAccount,
    getOrCreateAssociatedTokenAccount,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
    createAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

export const MintToForm: FC = () => {
    const [txSig, setTxSig] = useState("");
    const [tokenAccount, setTokenAccount] = useState("");
    const [balance, setBalance] = useState("");
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const link = () => {
        return txSig
            ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
            : "";
    };
    // Token Mint: 5e72cz3G3YJMcm5biRxSzWqE63NfYMHCyrQLD59mo3SD
    // recipient:BoZErCBMUtUL85UbgXnbPN4aaxx8uBdJsFpT9Hn8Ru1N

    const mintTo = async (event) => {
        console.log("========6666");
        event.preventDefault();
        // console.log("mint:", `${event}`);
        if (!connection || !publicKey) {
            // TODO: 弹出一个弹框
            return;
        }
        const transaction = new web3.Transaction();

        const mintPubKey = new web3.PublicKey(event.target.mint.value);

        // 这里是 接收方的地址，不是ATA, 而是原地址
        const recipientPubKey = new web3.PublicKey(
            event.target.recipient.value
        );
        const amount = event.target.amount.value;

        // TODO: 计算接收方的ATA, 应该改成 getOrCreateAssociatedTokenAccount
        const associatedToken = await getAssociatedTokenAddress(
            mintPubKey,
            recipientPubKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        // 如何知道接收方的ATA是否已经创建? 如果没有创建应该为接收方创建ATA
        // 参考getOrCreateAssociatedTokenAccount的实现： https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/actions/getOrCreateAssociatedTokenAccount.ts
        try {
            await getAccount(
                connection,
                associatedToken,
                "processed",
                TOKEN_PROGRAM_ID
            );
        } catch (error: unknown) {
            // 如果接收方不存在ATA, 则为其创建
            if (
                error instanceof TokenAccountNotFoundError ||
                error instanceof TokenInvalidAccountOwnerError
            ) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        associatedToken,
                        recipientPubKey,
                        mintPubKey
                    )
                );
            }
        }

        transaction.add(
            createMintToInstruction(
                mintPubKey,
                associatedToken,
                publicKey,
                amount
            )
        );

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(signature, "confirmed");

        setTxSig(signature);
        setTokenAccount(associatedToken.toString());

        const account = await getAccount(connection, associatedToken);
        setBalance(account.amount.toString());

        // https://explorer.solana.com/tx/RRUxufkSMS61mXbZwnwBNEzVa5DqwEoGWT1EY3TBbAcmRYVpVK8aC8v9WZen2DoUzm8JkhS1jrVEhDzPHaNU2jt?cluster=devnet
    };

    return (
        <div>
            <br />
            {publicKey ? (
                <form onSubmit={mintTo} className={styles.form}>
                    <label htmlFor="mint">Token Mint:</label>
                    <input
                        id="mint"
                        type="text"
                        className={styles.formField}
                        placeholder="Enter Token Mint"
                        required
                    />
                    <label htmlFor="recipient">Recipient:</label>
                    <input
                        id="recipient"
                        type="text"
                        className={styles.formField}
                        placeholder="Enter Recipient PublicKey"
                        required
                    />
                    <label htmlFor="amount">Amount Tokens to Mint:</label>
                    <input
                        id="amount"
                        type="text"
                        className={styles.formField}
                        placeholder="e.g. 100"
                        required
                    />
                    <button type="submit" className={styles.formButton}>
                        Mint Tokens
                    </button>
                </form>
            ) : (
                <span></span>
            )}
            {txSig ? (
                <div>
                    <p>Token Balance: {balance} </p>
                    <p>View your transaction on </p>
                    <a href={link()}>Solana Explorer</a>
                </div>
            ) : null}
        </div>
    );
};
