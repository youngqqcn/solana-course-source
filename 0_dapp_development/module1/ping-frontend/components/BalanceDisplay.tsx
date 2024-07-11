import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { FC, useEffect, useState } from "react";

// 显示余额
export const BalanceDisplay: FC = () => {
    const [balance, setBalance] = useState(0);
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    useEffect(() => {
        if (!connection || !publicKey) {
            return;
        }

        connection.onAccountChange(
            publicKey,
            (updatedAccountInfo) => {
                setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
            },
            "confirmed"
        );

        // 获取用户信息
        connection.getAccountInfo(publicKey).then((info) => {
            if (info) {
                setBalance(info.lamports);
            } else {
                setBalance(0);
            }
        });
    }, [connection, publicKey]);

    return (
        <div>
            {publicKey ? `Balance: ${balance / LAMPORTS_PER_SOL} SOL` : ""}
        </div>
    );
};
