import { linearRamp } from '../utils'

export class Envelope {
  active = false
  noteOn = false

  lastPhase: 'off' | 'attack' | 'decay' | 'sustain' | 'release' = 'off'
  lastValue = 0
  lastTime?: number

  gateDuration?: number
  releaseFrom?: number
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
    this.releaseFrom = undefined
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

    // If a note-off happened, we want to immediately jump to release (even if
    // we were still in attack/decay). We compute the release start level once
    // at gate-close, then ramp down from that.
    if (!this.noteOn) {
      this.gateDuration ??= elapsedTime

      if (this.releaseFrom == null) {
        if (this.gateDuration < a) {
          // Gate closed during attack.
          const factor = a === 0 ? 1 : this.gateDuration / a
          this.releaseFrom = linearRamp(factor, 0, 1)
        } else if (this.gateDuration < a + d && s > 0) {
          // Gate closed during decay.
          const factor = d === 0 ? 1 : (this.gateDuration - a) / d
          this.releaseFrom = linearRamp(factor, 1, s)
        } else if (s > 0) {
          // Gate closed during sustain.
          this.releaseFrom = s
        } else {
          // No sustain: treat it as full level.
          this.releaseFrom = 1
        }
      }

      const denom = r === 0 ? 1 : r
      const factor = Math.min(1, (elapsedTime - this.gateDuration) / denom)

      if (factor === 1) this.active = false

      this.lastPhase = 'release'
      this.lastValue = linearRamp(factor, this.releaseFrom ?? (s || 1), 0)
      return this.lastValue
    }

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
