// Chrome's built-in AI Prompt API (Gemini Nano), stable for web pages since
// Chrome 148. Only the parts the Ask tab uses.
type LanguageModelAvailability =
  'unavailable' | 'downloadable' | 'downloading' | 'available'

interface LanguageModelMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LanguageModelOptions {
  expectedInputs?: { type: 'text'; languages?: string[] }[]
  expectedOutputs?: { type: 'text'; languages?: string[] }[]
}

interface LanguageModelSession {
  promptStreaming(input: string): AsyncIterable<string>
  clone(): Promise<LanguageModelSession>
  destroy(): void
}

declare var LanguageModel:
  | {
      availability(
        options?: LanguageModelOptions
      ): Promise<LanguageModelAvailability>
      create(
        options?: LanguageModelOptions & {
          initialPrompts?: LanguageModelMessage[]
        }
      ): Promise<LanguageModelSession>
    }
  | undefined
