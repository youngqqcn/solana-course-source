import WalletContextProvider from "@/components/WalletContexProvider";
import { ChakraProvider } from "@chakra-ui/react";
import { ComponentType } from "react";

function MyApp({
    Component,
    pageProps,
}: {
    Component: ComponentType<any>;
    pageProps: any;
}) {
    return (
        <ChakraProvider>
            <WalletContextProvider>
                <Component {...pageProps} />
            </WalletContextProvider>
        </ChakraProvider>
    );
}

export default MyApp;
