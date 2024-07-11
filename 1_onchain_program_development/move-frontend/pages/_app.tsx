import { ComponentType } from "react";

function MyApp({
    Component,
    pageProps,
}: {
    Component: ComponentType<any>;
    pageProps: any;
}) {
    return <Component {...pageProps} />;
}

export default MyApp;
