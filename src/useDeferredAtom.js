const { useEffect, useState, useRef } = require('react')
const { deferred } = require('./utils')
const atomize = require('./atomize')

function useDeferredAtom(inputs) {
  const [state, setState] = useState({ round: 0, status: 'loading' })
  const deferRef = useRef(null)

  useEffect(() => {
    if (state.status !== 'loading') {
      setState({ status: 'loading', round: state.round + 1 })
    }
    deferRef.current = deferred()
  }, inputs)

  return {
    sendValue(value) {
      if (state.status !== 'ready') {
        setState({ status: 'ready', value, round: state.round })
        deferRef.current.resolve(value)
      }
    },
    sendError(error) {
      if (state.status !== 'aborted') {
        setState({ status: 'aborted', error, round: state.round })
        deferRef.current.reject(error)
      }
    },
    ...atomize(state, deferRef),
  }
}

module.exports = useDeferredAtom
