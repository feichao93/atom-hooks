const { ATOM } = require('./symbols')
const { useRef, useEffect } = require('react')

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
    return input.round
  } else {
    return input
  }
}

module.exports = { deferred, usePrev, invariant, resolveBasicInput }
