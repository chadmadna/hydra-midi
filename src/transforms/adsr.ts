import { Envelope } from '../lib/Envelope'
import { chainable } from '../utils'
import { scale } from './scale'
import { range } from './range'
import state from '../state'
import { value } from './value'
import { NoteId } from '../types'

const ENVELOPES_KEY = '__hydra_midi_envelopes__'
if (!(window as any)[ENVELOPES_KEY]) {
  ;(window as any)[ENVELOPES_KEY] = new Map<string, Envelope>()
}
export const envelopes: Map<string, Envelope> = (window as any)[ENVELOPES_KEY]

/**
 * Adsr is chainable to `note()`. It creates an envelope and returns a chainable
 * function, which in turn returns the envelope value at a given time.
 */
export const adsr =
  (noteId: NoteId, velocity: () => number) =>
  () =>
  (a: number, d: number, s: number, r: number) => {
    // Perform a deep merge with the adsr defaults.
    ;[a, d, s, r] = [a, d, s, r].map((arg, i) => arg ?? state.defaults.adsr[i])

    const envelope = new Envelope({ a, d, s, r })
    envelopes.set(noteId, envelope)

    let latchedVelocity = 0
    if (state.defaults.adsrVelocity === 'latched') {
      const { trigger } = envelope
      envelope.trigger = () => {
        latchedVelocity = velocity()
        trigger.call(envelope)
      }
    }

    return chainable(
      (ctx: { time: number }) =>
        envelope.value(ctx.time * 1000) *
        (state.defaults.adsrVelocity === 'latched'
          ? latchedVelocity
          : velocity()),
      {
        scale,
        range,
        value,
      },
    )
  }
