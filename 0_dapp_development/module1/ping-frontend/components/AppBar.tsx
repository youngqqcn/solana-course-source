import { FC } from "react";
import Image from "next/image";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const AppBar: FC = () => {
    return (
        <div>
            <Image src="/solanaLogo.png" height={30} width={200} alt={"logo"} />
            <span>Wallet-Adapter Example</span>
            <WalletMultiButton />
        </div>
    );
};
