import type {
  CCValues,
  Defaults,
  NoteEventContext,
  CCEventContext,
  AftEventContext,
} from './types'

const STATE_KEY = '__hydra_midi_state__'

// Persist state on window so re-evaluating the script (e.g. in Strudel) does
// not create fresh Maps that diverge from the ones the midiAccess handlers
// already hold references to.
if (!(window as any)[STATE_KEY]) {
  const ccValues: CCValues = new Map(
    JSON.parse(sessionStorage.getItem('hydra-midi_ccValues') || '[]'),
  )

  const aftValues: CCValues = new Map(
    JSON.parse(sessionStorage.getItem('hydra-midi_aftValues') || '[]'),
  )

  // Monkey-patch `ccValues.set` to make a kind of proxy.
  const { set } = ccValues
  ccValues.set = function (key: string, value: number) {
    const result = set.apply(this, [key, value])
    sessionStorage.setItem('hydra-midi_ccValues', JSON.stringify([...ccValues]))
    return result
  }

  // Monkey-patch `aftValues.set` to make a kind of proxy.
  const { set: setAft } = aftValues
  aftValues.set = function (key: string, value: number) {
    const result = setAft.apply(this, [key, value])
    sessionStorage.setItem(
      'hydra-midi_aftValues',
      JSON.stringify([...aftValues]),
    )
    return result
  }

  ;(window as any)[STATE_KEY] = {
    ccValues,
    aftValues,
    playingNotes: new Map<string, number>(),
    noteOnEvents: new Map<string, (context: NoteEventContext) => void>(),
    ccEvents: new Map<string, (context: CCEventContext) => void>(),
    aftEvents: new Map<string, (context: AftEventContext) => void>(),
    defaults: {
      channel: '*',
      input: '*',
      adsr: [100, 100, 1, 100],
      adsrVelocity: 'live',
      noteOff: 'default',
    } as Defaults,
  }
}

export default (window as any)[STATE_KEY] as {
  ccValues: CCValues
  aftValues: CCValues
  playingNotes: Map<string, number>
  noteOnEvents: Map<string, (context: NoteEventContext) => void>
  ccEvents: Map<string, (context: CCEventContext) => void>
  aftEvents: Map<string, (context: AftEventContext) => void>
  defaults: Defaults
}
