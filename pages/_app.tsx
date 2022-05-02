import type { AppProps } from "next/app";
import { ViewportsContextProvider } from "../store/viewports";
import "../styles/globals.css";
require("antd/dist/antd.less");

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ViewportsContextProvider>
      <Component {...pageProps} />
    </ViewportsContextProvider>
  );
}

export default MyApp;
