import { NextPage } from "next";
import Head from "next/head";
import { PingButton } from "../components/PingButton";
import { AppBar } from "@/components/AppBar";
import WalletContextProvider from "@/components/WalletContexProvider";

const Home: NextPage = (props) => {
    return (
        <div>
            <Head>
                <title>Wallet-Adapter Example</title>
                <meta name="description" content="Wallet-Adapter Example" />
            </Head>
            <WalletContextProvider>
                <AppBar />
                <PingButton />
            </WalletContextProvider>
        </div>
    );
};

export default Home;
