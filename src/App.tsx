import { ViewportsContextProvider } from '../store/viewports'
import { Canvas } from '../components/Canvas'

export default function App() {
  return (
    <ViewportsContextProvider>
      <Canvas />
    </ViewportsContextProvider>
  )
}
