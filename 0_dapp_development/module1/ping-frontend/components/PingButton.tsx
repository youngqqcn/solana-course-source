import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState } from "react";
// import styles from '../styles/PingButton.module.css'

// const PROGRAM_ID = `ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa`
// const DATA_ACCOUNT_PUBKEY = `Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod`

export const PingButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const onClick = () => {
        console.log("Ping!");

        if (!connection || !publicKey) {
            return;
        }
    };

    return (
        <div onClick={onClick}>
            <button>Ping!</button>
        </div>
    );
};
