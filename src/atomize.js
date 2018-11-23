const { useEffect, useRef } = require('react')
const { ATOM, KEEP } = require('./symbols')

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
        return loading ? loading() : null
      }
      if (status === 'ready') {
        return ready ? (lastRenderRef.current = ready(value)) : null
      }
      if (status === 'aborted') {
        return aborted ? (lastRenderRef.current = aborted(error)) : null
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

module.exports = atomize
