import { NextPage } from "next";
// import styles from '../styles/Home.module.css'
// import { AppBar } from '../components/AppBar'
import Head from "next/head";
import { PingButton } from "../components/PingButton";

const Home: NextPage = (props) => {
    return (
        <div>
            <Head>
                <title>Wallet-Adapter Example</title>
                <meta name="description" content="Wallet-Adapter Example" />
            </Head>
            {/* <AppBar /> */}
            <div>
                <PingButton />
            </div>
        </div>
    );
};

export default Home;
