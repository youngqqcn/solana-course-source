import { FC } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

// 仅在客户端渲染, 解决报错
const WalletMultiButtonDynamic = dynamic(
    async () =>
        (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
    { ssr: false }
);

export const AppBar: FC = () => {
    return (
        <div>
            <Image src="/solanaLogo.png" height={30} width={200} alt={"logo"} />
            <span>Wallet-Adapter Example</span>
            <WalletMultiButtonDynamic />
        </div>
    );
};
