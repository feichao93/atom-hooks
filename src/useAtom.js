const { useEffect, useState, useRef } = require('react')
const { deferred, resolveBasicInput } = require('./utils')
const { CANCELLED } = require('./symbols')
const atomize = require('./atomize')

function useBasicAtom(fetcher, inputs) {
  const [state, setState] = useState({ status: 'loading', round: 0 })
  const deferRef = useRef(null)

  useEffect(() => {
    deferRef.current = deferred()
    const cancellation = deferred()

    if (state.status !== 'loading') {
      setState({ status: 'loading', round: state.round + 1 })
    }

    Promise.race([cancellation.promise, fetcher()])
      .then(value => {
        if (value === CANCELLED) {
          return
        }
        setState({ status: 'ready', value, round: state.round })
        deferRef.current.resolve(value)
      })
      .catch(error => {
        setState({ status: 'aborted', error, round: state.round })
        deferRef.current.reject(error)
      })

    return () => {
      cancellation.resolve(CANCELLED)
    }
  }, inputs)

  return atomize(state, deferRef)
}

function useAtom(deps, fetcher, inputs) {
  if (typeof deps === 'function') {
    // [deps, fetcher, inputs] = [[], deps, fetcher]
    inputs = fetcher
    fetcher = deps
    deps = []
  }

  const basicFetcher = async () => {
    const values = await Promise.all(deps.map(atom => atom.toPromise()))
    return fetcher(...values)
  }

  const basicInputs = inputs && inputs.map(resolveBasicInput)

  return useBasicAtom(basicFetcher, basicInputs)
}

module.exports = useAtom
