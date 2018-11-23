const { useEffect, useState, useRef } = require('react')
const { deferred } = require('./utils')
const atomize = require('./atomize')

function useDeferredAtom(inputs) {
  const [state, setState] = useState({ status: 'loading' })
  const deferRef = useRef(null)

  useEffect(() => {
    deferRef.current = deferred()
  }, inputs)

  return {
    sendValue(value) {
      setState({ status: 'ready', value })
      deferRef.current.resolve(value)
    },
    sendError(error) {
      setState({ status: 'aborted', error })
      deferRef.current.reject(error)
    },
    ...atomize(state, deferRef),
  }
}

module.exports = useDeferredAtom
