import { ViewportsContextProvider } from 'store/viewports'
import { Canvas } from '../components/Canvas'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yufeng Li',
  description: 'Yufeng Li Portfolio'
}

export default function HomePage() {
  return (
    <ViewportsContextProvider>
      <Canvas />
    </ViewportsContextProvider>
  )
}
