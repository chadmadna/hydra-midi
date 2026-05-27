// @ts-ignore
import css from './index.css'
import { MidiMessageType } from './types'
import { envelopes } from './transforms/adsr'

let gui = document.querySelector<HTMLElement>('.hydra-midi-gui')
let inputs = gui?.querySelector<HTMLElement>('.hydra-midi-inputs') ?? null
let messages = gui?.querySelector<HTMLElement>('.hydra-midi-messages') ?? null
let envelopePanel = gui?.querySelector<HTMLElement>('.hydra-midi-envelopes') ?? null

const maxMessages = 10
let isEnabled = false
let rafId: number | null = null

const setup = () => {
  const style = document.createElement('style')
  style.innerText = css
  document.head.append(style)

  gui = document.createElement('div')
  gui.classList.add('hydra-midi-gui')
  gui.innerHTML = `
      <div class="hydra-midi-inputs"></div>
      <span>⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯</span>
      <div class="hydra-midi-heading">Ch Type Values</div>
      <div class="hydra-midi-messages">${[...Array(maxMessages)]
        .map(() => `<div></div>`)
        .join('')}</div>
      <span>⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯</span>
      <div class="hydra-midi-heading">Envelope phases</div>
      <div class="hydra-midi-envelopes"></div>
    `

  document.body.append(gui)
  inputs = gui.querySelector<HTMLElement>('.hydra-midi-inputs')
  messages = gui.querySelector<HTMLElement>('.hydra-midi-messages')
  envelopePanel = gui.querySelector<HTMLElement>('.hydra-midi-envelopes')
}

const renderEnvelopes = () => {
  if (!isEnabled || !envelopePanel) return

  const rows: string[] = []
  for (const [id, env] of envelopes.entries()) {
    const phase = env.lastPhase ?? 'off'
    const value =
      typeof env.lastValue === 'number' ? env.lastValue.toFixed(3) : 'n/a'
    rows.push(`${id}  ${phase.padEnd(7, ' ')}  ${value}`)
  }

  envelopePanel.innerText = rows.slice(0, 12).join('\n') || '(no envelopes)'
}

const loop = () => {
  if (!isEnabled) return
  renderEnvelopes()
  rafId = requestAnimationFrame(loop)
}

/**
 * Show the gui and set it up if necessary.
 */
export const show = () => {
  if (!gui) setup()
  if (gui) gui.hidden = false
  isEnabled = true
  if (rafId == null) rafId = requestAnimationFrame(loop)
}

/**
 * Hide the gui.
 */
export const hide = () => {
  if (gui) gui.hidden = true
  isEnabled = false
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/**
 * Render a list of all open midi inputs.
 */
export const showInputs = (list: MIDIInputMap) => {
  if (!isEnabled) return

  const getInputName = (input: MIDIInput) => input.name ?? input.id ?? 'n/a'
  const template = (input: MIDIInput, index: number) =>
    `<div class="hydra-midi-input" style="color: var(--color-${input.id})">` +
    `#${index} ` +
    `<span class="hydra-midi-input-name">${getInputName(input)}</span>` +
    `</div>`

  if (inputs) inputs.innerHTML = [...list.values()].map(template).join('')
}

/**
 * Log a midi message and highlight the corresponding input.
 */
export const logMidiMessage = (message: {
  input: MIDIInput
  channel: number
  type: MidiMessageType
  data: number[]
}) => {
  if (!isEnabled || !messages) return

  const pad = (value: any, length = 3) => String(value).padEnd(length, ' ')

  const { input } = message
  const channel = pad(message.channel, 2)
  const type = pad(message.type, 4)
  const data1 = pad(message.data[0])
  const data2 = message.data[1] ? pad(message.data[1]) : ''

  if (messages.firstChild) messages.removeChild(messages.firstChild)
  const el = document.createElement('div')
  el.style.color = `var(--color-midi-${type})`
  el.innerHTML = [channel, type, data1, data2].join(' ')
  messages.append(el)

  highlightInput(input, message.type)
}

const highlightTimeouts = new Map<string, number>()
/**
 * Let the input flash for a short moment in the color of the received midi
 * message.
 */
const highlightInput = (input: MIDIInput, type: MidiMessageType) => {
  if (!gui) return

  clearTimeout(highlightTimeouts.get(input.id))

  const inputColorVariable = `--color-${input.id}`
  gui.style.setProperty(inputColorVariable, `var(--color-midi-${type})`)

  highlightTimeouts.set(
    input.id,
    setTimeout(() => gui?.style.setProperty(inputColorVariable, null), 100),
  )
}
