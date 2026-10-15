import type { InitProgressReport, MLCEngineInterface } from '@mlc-ai/web-llm'
import { EXAMPLES, SYSTEM_PROMPT } from './knowledge'

export type Turn = { role: 'user' | 'assistant'; content: string }

// The on-device model that answers typed questions, if any:
// - nano: Chrome's built-in Gemini Nano, already on the device (no download)
// - webllm: Qwen3.5 2B on WebGPU, downloaded once the visitor asks for it
// - none: phones and browsers without WebGPU get the written answers only
export type Detected =
  | { kind: 'nano' }
  | { kind: 'webllm'; modelId: string; cached: boolean }
  | { kind: 'none' }

export type ModelState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string }

type Answerer = (
  history: Turn[],
  question: string,
  onText: (text: string) => void
) => Promise<string>

// Qwen3.5 2B answered most accurately of the small models tried in the
// browser (Qwen3.5 0.8B, Llama 3.2 1B and Gemma 3 1B). Both builds are 1.1 GB;
// the f32 one is for GPUs without 16-bit float support.
const QWEN_F16 = 'Qwen3.5-2B-q4f16_1-MLC'
const QWEN_F32 = 'Qwen3.5-2B-q4f32_1-MLC'
export const MODEL_SIZE = '1.1 GB'

const ENGLISH_TEXT = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }]
}

// Recent turns sent along with each question so follow-ups make sense
const HISTORY_TURNS = 4

type WebGPU = {
  requestAdapter(): Promise<{
    features: { has(feature: string): boolean }
  } | null>
}

let detection: Promise<Detected> | undefined
export const detectEngine = () => (detection ??= detect())

const detect = async (): Promise<Detected> => {
  try {
    if (
      typeof LanguageModel !== 'undefined' &&
      (await LanguageModel.availability(ENGLISH_TEXT)) === 'available'
    ) {
      return { kind: 'nano' }
    }
  } catch {
    // No usable Prompt API; try WebGPU
  }

  const gpu = (navigator as Navigator & { gpu?: WebGPU }).gpu
  // A 1.1 GB model is more than phone and tablet browsers can hold
  if (!gpu || matchMedia('(pointer: coarse)').matches) return { kind: 'none' }
  const adapter = await gpu.requestAdapter().catch(() => null)
  if (!adapter) return { kind: 'none' }

  const modelId = adapter.features.has('shader-f16') ? QWEN_F16 : QWEN_F32
  return { kind: 'webllm', modelId, cached: readLoaded() === modelId }
}

// Remembers a finished load so a returning visitor's model starts without a
// prompt. Cheaper than asking WebLLM, which is 2 MB of script to fetch.
const LOADED_KEY = 'ask:loaded-model'
const readLoaded = () => {
  try {
    return localStorage.getItem(LOADED_KEY)
  } catch {
    return null
  }
}
const writeLoaded = (modelId: string) => {
  try {
    localStorage.setItem(LOADED_KEY, modelId)
  } catch {
    // Storage blocked: the next visit just shows the load button again
  }
}

let state: ModelState = { status: 'idle' }
const listeners = new Set<(state: ModelState) => void>()
const setState = (next: ModelState) => {
  state = next
  listeners.forEach((listener) => listener(state))
}

export const onModelState = (listener: (state: ModelState) => void) => {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

let answerer: Promise<Answerer> | undefined

// Loads the model once per page; later calls share the same load
export const loadModel = () =>
  (answerer ??= (async () => {
    try {
      const detected = await detectEngine()
      if (detected.kind === 'none') throw new Error('no on-device model here')
      setState({ status: 'loading', progress: 0 })
      const answer =
        detected.kind === 'nano'
          ? await nanoAnswerer()
          : await webllmAnswerer(detected.modelId)
      setState({ status: 'ready' })
      return answer
    } catch (error) {
      answerer = undefined
      setState({ status: 'error', message: String(error) })
      throw error
    }
  })())

export const askModel = async (
  history: Turn[],
  question: string,
  onText: (text: string) => void
) => (await loadModel())(history.slice(-HISTORY_TURNS), question, onText)

const nanoAnswerer = async (): Promise<Answerer> => {
  // Reads the facts once; a fresh session per question took 13 s to answer
  // the first one, a clone of this one starts in well under a second
  const base = await LanguageModel!.create({
    ...ENGLISH_TEXT,
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }, ...EXAMPLES]
  })

  return async (history, question, onText) => {
    const session = await base.clone()
    try {
      let text = ''
      for await (const chunk of session.promptStreaming(
        withHistory(history, question)
      )) {
        text += chunk
        onText(tidy(text))
      }
      return tidy(text)
    } finally {
      session.destroy()
    }
  }
}

// A clone can't take earlier turns as messages, so they go in the prompt
const withHistory = (history: Turn[], question: string) =>
  history.length
    ? `Conversation so far:\n${history
        .map((t) => `${t.role === 'user' ? 'Visitor' : 'You'}: ${t.content}`)
        .join('\n')}\n\nNew question: ${question}`
    : question

const webllmAnswerer = async (modelId: string): Promise<Answerer> => {
  const webllm = await import('@mlc-ai/web-llm')
  const initProgressCallback = (report: InitProgressReport) =>
    setState({ status: 'loading', progress: report.progress })

  let llm: MLCEngineInterface
  // A worker keeps generation off the thread that renders the 3D scene
  const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), {
    type: 'module'
  })
  try {
    llm = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback
    })
  } catch (error) {
    console.warn('[ask] worker failed to load the model, using the page', error)
    worker.terminate()
    llm = await webllm.CreateMLCEngine(modelId, { initProgressCallback })
  }
  writeLoaded(modelId)

  return async (history, question, onText) => {
    // Settings from testing: low temperature keeps it to the facts, the
    // frequency penalty stops it repeating itself
    const stream = await llm.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...EXAMPLES,
        ...history,
        { role: 'user', content: question }
      ],
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0.3,
      max_tokens: 180,
      stream: true,
      extra_body: { enable_thinking: false }
    })
    let text = ''
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta?.content ?? ''
      onText(tidy(text))
    }
    return tidy(text)
  }
}

// Drops reasoning blocks and repeated paragraphs, which small models
// occasionally loop on
const tidy = (text: string) => {
  const seen = new Set<string>()
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
    .split(/\n{2,}/)
    .filter((paragraph) => {
      const key = paragraph.trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join('\n\n')
    .trim()
}
