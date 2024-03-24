'use client'
import { ViewportsContextProvider } from 'store/viewports'
import { Canvas } from '../components/Canvas'

export default function HomePage() {
  return (
    <ViewportsContextProvider>
      <Canvas />
    </ViewportsContextProvider>
  )
}
