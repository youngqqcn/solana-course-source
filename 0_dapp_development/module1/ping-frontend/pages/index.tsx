import { NextPage } from "next";
import Head from "next/head";
import { PingButton } from "../components/PingButton";
import { AppBar } from "@/components/AppBar";

const Home: NextPage = (props) => {
    return (
        <div>
            <Head>
                <title>Wallet-Adapter Example</title>
                <meta name="description" content="Wallet-Adapter Example" />
            </Head>
            <AppBar />
            <div>
                <PingButton />
            </div>
        </div>
    );
};

export default Home;
