const { useEffect, useState, useRef } = require('react')

const CANCELLED = Symbol('CANCELLED')
const ATOM = Symbol('ATOM')
const KEEP = Symbol('KEEP')

function deferred() {
  const def = {}
  def.promise = new Promise((resolve, reject) => {
    def.resolve = resolve
    def.reject = reject
  })
  return def
}

function usePrev(next) {
  const ref = useRef()
  useEffect(() => {
    ref.current = next
  })
  return ref.current
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function resolveBasicInput(input) {
  if (input && input[ATOM]) {
    return input.status === 'loading'
  } else {
    return input
  }
}

function withRenderer(atom) {
  const { status, value, error } = atom

  const lastRenderRef = useRef(null)

  const loading = fn => renderer({ loading: fn })
  const loadingKeep = () => renderer({ loading: KEEP })
  const ready = fn => renderer({ ready: fn })
  const aborted = fn => renderer({ aborted: fn })

  return {
    ...atom,
    loading,
    loadingKeep,
    ready,
    aborted,
  }

  function renderer({ loading, ready, aborted }) {
    function render() {
      if (status === 'loading') {
        if (loading === KEEP) {
          return lastRenderRef.current
        }
        return loading && loading()
      }
      if (status === 'ready') {
        return ready && (lastRenderRef.current = ready(value))
      }
      if (status === 'aborted') {
        return aborted && (lastRenderRef.current = aborted(error))
      }
    }

    return {
      render,
      loading: fn => renderer({ loading: fn, ready, aborted }),
      loadingKeep: () => renderer({ loading: KEEP, ready, aborted }),
      ready: fn => renderer({ loading, ready: fn, aborted }),
      aborted: fn => renderer({ loading, ready, aborted: fn }),
    }
  }
}

function withLifecycleHooks(atom) {
  function useWhenLoading(fn) {
    useEffect(
      () => {
        if (atom.status !== 'loading') {
          return
        }
        return fn()
      },
      [atom.status === 'loading'],
    )
    return atom
  }

  function useWhenReady(fn) {
    useEffect(
      () => {
        if (atom.status !== 'ready') {
          return
        }
        return fn(atom.value)
      },
      [atom.status === 'ready'],
    )
    return atom
  }

  function useWhenAborted(fn) {
    useEffect(
      () => {
        if (atom.status !== 'aborted') {
          return
        }
        return fn(atom.error)
      },
      [atom.status === 'aborted'],
    )
    return atom
  }

  return {
    ...atom,
    useWhenLoading,
    useWhenReady,
    useWhenAborted,
  }
}

function atomize({ status, value, error }, deferRef) {
  const toPromise = () => deferRef.current.promise

  const atom = {
    [ATOM]: true,
    status,
    value,
    error,
    toPromise,
  }

  return withLifecycleHooks(withRenderer(atom))
}

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
  return { status, value, error }
}

function useBasicAtom(fetcher, inputs) {
  const [state, setState] = useState({ status: 'loading' })
  const deferRef = useRef(null)

  useEffect(() => {
    deferRef.current = deferred()
    const cancellation = deferred()

    if (state.status !== 'loading') {
      setState({ status: 'loading' })
    }

    Promise.race([cancellation.promise, fetcher()])
      .then(value => {
        if (value === CANCELLED) {
          return
        }
        setState({ status: 'ready', value })
        deferRef.current.resolve(value)
      })
      .catch(error => {
        setState({ status: 'aborted', error })
        deferRef.current.reject(error)
      })

    return () => {
      cancellation.resolve(CANCELLED)
    }
  }, inputs)

  return atomize(state, deferRef)
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
        setState({ status: 'ready', value: compoundValue })
        deferRef.current.resolve(compoundValue)
      }
    })

    atom.useWhenAborted(error => {
      if (state.status !== 'aborted') {
        setState({ status: 'aborted', error })
        deferRef.current.reject(error)
      }
    })

    atom.useWhenLoading(() => {
      if (state.status !== 'loading') {
        setState({ status: 'loading' })
        deferRef.current = deferred()
      }
    })
  }

  return atomize(state, deferRef)
}

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

module.exports = { useAtom, useDeferredAtom, useCombinedAtom }
