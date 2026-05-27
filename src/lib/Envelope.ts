import { linearRamp } from '../utils'

export class Envelope {
  active = false
  noteOn = false

  lastPhase: 'off' | 'attack' | 'decay' | 'sustain' | 'release' = 'off'
  lastValue = 0
  lastTime?: number

  gateDuration?: number
  startTime?: number

  a: number
  d: number
  s: number
  r: number

  constructor({ a, d, s, r }: { a: number; d: number; s: number; r: number }) {
    this.a = a
    this.d = d
    this.s = s
    this.r = r
  }

  trigger() {
    this.startTime = undefined
    this.gateDuration = undefined
    this.noteOn = true
    this.active = true
  }

  stop() {
    this.noteOn = false
  }

  value(time: number): number {
    this.lastTime = time

    if (!this.active) {
      this.lastPhase = 'off'
      this.lastValue = 0
      return 0
    }

    this.startTime ??= time
    const elapsedTime = time - this.startTime
    const { a, d, s, r } = this

    if (elapsedTime < a) {
      // Attack
      const factor = elapsedTime / a
      this.lastPhase = 'attack'
      this.lastValue = linearRamp(factor, 0, 1)
      return this.lastValue
    } else if (elapsedTime < a + d && s > 0) {
      // Decay (only if there is sustain)
      const factor = (elapsedTime - a) / d
      this.lastPhase = 'decay'
      this.lastValue = linearRamp(factor, 1, s)
      return this.lastValue
    } else if (this.noteOn && s > 0) {
      // Sustain (if the note is still on and there is sustain)
      this.lastPhase = 'sustain'
      this.lastValue = s
      return s
    } else {
      // Release
      this.gateDuration ??= elapsedTime
      const factor = Math.min(1, (elapsedTime - this.gateDuration) / r)

      // Envelope has finished.
      if (factor === 1) this.active = false

      // If there was no sustain, there also was no decay so we can start the
      // release at 1.0
      const from = s || 1
      this.lastPhase = 'release'
      this.lastValue = linearRamp(factor, from, 0)
      return this.lastValue
    }
  }
}
