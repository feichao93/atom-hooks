const { useEffect, useState, useRef } = require('react')
const { deferred, usePrev, invariant } = require('./utils')
const atomize = require('./atomize')

function getInitialState(atoms) {
  let status
  let value
  let error
  const abortedAtom = atoms.find(atom => atom.status === 'aborted')
  if (abortedAtom) {
    status = 'aborted'
    error = abortedAtom.error
  } else if (atoms.every(atom => atom.status === 'ready')) {
    status = 'ready'
    value = atoms.map(atom => atom.value)
  } else {
    status = 'loading'
  }
  return { status, value, error, round: 0 }
}

function useCombinedAtom(...atoms) {
  const prevAtomCount = usePrev(atoms.length)
  if (prevAtomCount !== undefined) {
    invariant(
      atoms.length === prevAtomCount,
      `useCombinedAtom(...atoms) get a different count of atoms.`,
    )
  }

  const [state, setState] = useState(() => getInitialState(atoms))

  const deferRef = useRef(null)

  useEffect(() => {
    deferRef.current = deferred()
    const initialState = getInitialState(atoms)
    if (initialState.status === 'ready') {
      deferRef.current.resolve(initialState.value)
    } else if (initialState.status === 'aborted') {
      deferRef.current.reject(initialState.error)
    }
  }, [])

  for (const atom of atoms) {
    atom.useWhenReady(() => {
      if (atoms.every(atom => atom.status === 'ready')) {
        const compoundValue = atoms.map(atom => atom.value)
        setState({ status: 'ready', value: compoundValue, round: state.round })
        deferRef.current.resolve(compoundValue)
      }
    })

    atom.useWhenAborted(error => {
      if (state.status !== 'aborted') {
        setState({ status: 'aborted', error, round: state.round })
        deferRef.current.reject(error)
      }
    })

    atom.useWhenLoading(() => {
      if (state.status !== 'loading') {
        setState({ status: 'loading', round: state.round + 1 })
        deferRef.current = deferred()
      }
    })
  }

  return atomize(state, deferRef)
}

module.exports = useCombinedAtom
