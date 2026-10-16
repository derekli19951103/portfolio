import './ask.css'
import {
  MODEL_SIZE,
  askModel,
  detectEngine,
  loadModel,
  onModelState,
  type Detected,
  type ModelState,
  type Turn
} from './engines'
import {
  NO_QUICK_ANSWER,
  OFF_TOPIC,
  QUICK_ANSWERS,
  findQuickAnswer,
  looksLikeOverride
} from './knowledge'

// Kept across tab switches so the conversation is still there on return
const log: Turn[] = []
let answering = false
const logListeners = new Set<() => void>()
const notify = () => logListeners.forEach((listener) => listener())

// Answers are typed out: characters shown so far for each one still typing
const typing = new Map<Turn, number>()
// A steady pace, sped up for long answers so none takes longer than this
const CHARS_PER_SECOND = 90
const MAX_TYPING_SECONDS = 3.5
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let frame = 0
let lastFrameTime = 0

const create = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
  text = ''
) => {
  const node = document.createElement(tag)
  node.className = className
  Object.entries(attributes).forEach(([name, value]) =>
    node.setAttribute(name, value)
  )
  node.textContent = text
  return node
}

// Answers render as text, so strip the markdown the models sometimes add
const plain = (text: string) =>
  text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ')

const isStreaming = (turn: Turn) => answering && turn === log[log.length - 1]

const shownText = (turn: Turn) => {
  const text = plain(turn.content)
  const shown = typing.get(turn)
  return shown === undefined ? text : text.slice(0, Math.floor(shown))
}

const tick = (now: number) => {
  const seconds = lastFrameTime ? (now - lastFrameTime) / 1000 : 0
  lastFrameTime = now
  for (const [turn, shown] of typing) {
    const length = plain(turn.content).length
    const rate = Math.max(CHARS_PER_SECOND, length / MAX_TYPING_SECONDS)
    const next = Math.min(length, shown + rate * seconds)
    // A reply the model is still writing keeps its cursor until it's done
    if (next >= length && !isStreaming(turn)) typing.delete(turn)
    else typing.set(turn, next)
  }
  notify()
  frame = typing.size ? requestAnimationFrame(tick) : 0
  if (!frame) lastFrameTime = 0
}

const startTyping = (turn: Turn) => {
  if (reducedMotion.matches) return
  typing.set(turn, 0)
  frame ||= requestAnimationFrame(tick)
}

const ask = async (
  question: string,
  written: string | undefined,
  modelReady: boolean,
  fallback: string
) => {
  if (!question || answering) return
  // A new question finishes any answer still being typed
  typing.clear()
  const history = log.slice()
  log.push({ role: 'user', content: question })
  if (looksLikeOverride(question)) written = OFF_TOPIC

  if (written === undefined && modelReady) {
    const reply: Turn = { role: 'assistant', content: '' }
    log.push(reply)
    answering = true
    startTyping(reply)
    notify()
    try {
      reply.content = await askModel(history, question, (text) => {
        reply.content = text
        notify()
      })
    } catch (error) {
      console.warn('[ask] the model failed to answer', error)
    }
    reply.content ||= findQuickAnswer(question)?.answer ?? fallback
    answering = false
  } else {
    const reply: Turn = {
      role: 'assistant',
      content: written ?? findQuickAnswer(question)?.answer ?? fallback
    }
    log.push(reply)
    startTyping(reply)
  }
  notify()
}

export const mountAskPanel = (parent: HTMLElement) => {
  const panel = create('section', 'ask-panel', {
    'aria-label': 'Ask about Derek'
  })
  const messages = create('div', 'ask-log', { 'aria-live': 'polite' })
  const chips = create('div', 'ask-chips')
  const form = create('form', 'ask-form')
  const input = create('input', 'ask-input', {
    type: 'text',
    maxlength: '300',
    autocomplete: 'off',
    placeholder: 'Ask about his work…',
    'aria-label': 'Your question'
  })
  const submit = create('button', 'ask-send', { type: 'submit' }, 'Ask')
  const status = create('div', 'ask-status')
  messages.append(
    create(
      'p',
      'ask-msg ask-msg--assistant',
      {},
      "Ask about Derek's AI agent work, projects or skills."
    )
  )
  form.append(input, submit)
  panel.append(messages, chips, form, status)
  parent.append(panel)

  let detected: Detected | undefined
  let model: ModelState = { status: 'idle' }
  const canLoad = () => detected?.kind === 'webllm' && model.status !== 'ready'

  // Runs every frame while an answer types, so it only touches what changed
  const renderMessages = () => {
    // Follow new text unless the visitor has scrolled up to read
    const following =
      messages.scrollHeight - messages.scrollTop - messages.clientHeight < 32
    // The greeting is the first child, so turn i is child i + 1
    while (messages.children.length < log.length + 1) {
      const turn = log[messages.children.length - 1]
      messages.append(create('p', `ask-msg ask-msg--${turn.role}`))
    }
    log.forEach((turn, i) => {
      const node = messages.children[i + 1]
      const text = shownText(turn)
      if (node.textContent !== text) node.textContent = text
      node.classList.toggle(
        'ask-msg--pending',
        typing.has(turn) || isStreaming(turn)
      )
    })
    // Screen readers wait for the whole answer instead of every letter
    messages.setAttribute('aria-busy', String(typing.size > 0))
    if (following) messages.scrollTop = messages.scrollHeight
    submit.disabled = answering
  }

  const renderStatus = () => {
    status.replaceChildren()
    if (!detected) {
      status.append('Checking for on-device AI…')
    } else if (detected.kind === 'none') {
      status.append(
        'Written answers here. A desktop browser can load an AI to answer anything.'
      )
    } else if (model.status === 'ready') {
      const name =
        detected.kind === 'nano'
          ? "Chrome's built-in Gemini Nano"
          : 'Qwen3.5 2B'
      const resume = create(
        'a',
        '',
        { href: '/resume.html', target: '_blank', rel: 'noopener' },
        'his resume'
      )
      // One span so the sentence wraps as text, not as separate flex items
      const note = create('span', '')
      note.append(
        `${name} answers on your device and can make mistakes; `,
        resume,
        ' has the details.'
      )
      status.append(note)
    } else if (model.status === 'loading' && detected.kind === 'nano') {
      // Already on the device: nothing to download, so no progress to show
      status.append('Starting the AI…')
    } else if (model.status === 'loading') {
      // One figure covers both the first download and later starts from cache
      const percent = Math.round(model.progress * 100)
      const bar = create('div', 'ask-progress')
      const fill = create('span', '')
      fill.style.width = `${percent}%`
      bar.append(fill)
      status.append(`Loading the AI · ${percent}%`, bar)
    } else {
      const load = create(
        'button',
        'ask-load',
        { type: 'button' },
        `Load AI · ${MODEL_SIZE}`
      )
      load.addEventListener('click', () => {
        loadModel().catch(() => {})
      })
      status.append(
        model.status === 'error'
          ? "The AI couldn't start, so answers are written ones. "
          : 'Ask anything with an AI that runs in your browser. ',
        load
      )
    }
  }

  QUICK_ANSWERS.filter((qa) => qa.chip).forEach((qa) => {
    const chip = create('button', 'ask-chip', { type: 'button' }, qa.chip)
    chip.addEventListener('click', () => {
      ask(qa.question, qa.answer, false, NO_QUICK_ANSWER)
    })
    chips.append(chip)
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const question = input.value.trim()
    if (!question || answering) return
    input.value = ''
    const fallback = canLoad()
      ? `${NO_QUICK_ANSWER} Or load the AI below to ask anything.`
      : NO_QUICK_ANSWER
    ask(question, undefined, model.status === 'ready', fallback)
  })

  logListeners.add(renderMessages)
  renderMessages()
  const unsubscribe = onModelState((next) => {
    model = next
    renderStatus()
  })
  detectEngine().then((result) => {
    detected = result
    // No download needed for these, so start them straight away
    if (result.kind === 'nano' || (result.kind === 'webllm' && result.cached)) {
      loadModel().catch(() => {})
    }
    renderStatus()
  })

  // Typing is the point of the tab, but a phone keyboard would cover the board
  if (matchMedia('(pointer: fine)').matches)
    input.focus({ preventScroll: true })

  return () => {
    unsubscribe()
    logListeners.delete(renderMessages)
    panel.remove()
  }
}
