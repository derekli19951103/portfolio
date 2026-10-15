import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// Runs the Ask tab's model off the main thread
const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (event: MessageEvent) => handler.onmessage(event)
