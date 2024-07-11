import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState } from "react";
// import styles from '../styles/PingButton.module.css'
import * as web3 from "@solana/web3.js";
// import { getExplorerLink } from "@solana-developers/helpers";

const PROGRAM_ID = `ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa`;
const DATA_ACCOUNT_PUBKEY = `Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod`;

export const PingButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [txSig, setTxSig] = useState("");

    const onClick = () => {
        console.log("Ping!");

        if (!connection || !publicKey) {
            return;
        }

        const network = connection.rpcEndpoint.includes("devnet")
            ? "devnet"
            : connection.rpcEndpoint.includes("testnet")
            ? "testnet"
            : "mainnet-beta";

        const programId = new web3.PublicKey(PROGRAM_ID);
        const programDataAccount = new web3.PublicKey(DATA_ACCOUNT_PUBKEY);
        const transaction = new web3.Transaction().add(
            new web3.TransactionInstruction({
                keys: [
                    {
                        pubkey: programDataAccount,
                        isSigner: false,
                        isWritable: true,
                    },
                ],
                programId: programId,
            })
        );

        // 使用 wallet-adapter发送交易
        sendTransaction(transaction, connection).then((txSig) => {
            let link = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;
            console.log(link);
            setTxSig(link);
        });
    };

    return (
        <div>
            <button onClick={onClick}> {<i className="icon"></i>} Ping!</button>
            {txSig ? (
                <div>
                    <p>View your transaction on </p>
                    <a href={txSig}>{txSig}</a>
                </div>
            ) : null}
        </div>
    );
};
