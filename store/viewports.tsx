import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";
import Viewport from "../engine/Viewport";

export interface Viewports {
  viewport1: Viewport | undefined;
}

export const defaultViewports: {
  viewport1: Viewport | undefined;
} = {
  viewport1: undefined,
};

export const ViewportsContext = createContext<{
  viewports: Viewports;
  setViewports: Dispatch<SetStateAction<Viewports>>;
}>({ viewports: defaultViewports, setViewports: () => {} });

export const ViewportsContextProvider = ({ children }: any) => {
  const [currentViewports, setCurrentViewports] = useState(defaultViewports);

  return (
    <ViewportsContext.Provider
      value={{ viewports: currentViewports, setViewports: setCurrentViewports }}
    >
      {children}
    </ViewportsContext.Provider>
  );
};

export const useViewports = () => {
  const context = useContext(ViewportsContext);
  return context;
};
