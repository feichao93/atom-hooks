type Fetcher<ARGS extends any[], T> = (...args: ARGS) => Promise<T>
type CleanupFunc = () => any

// TODO remove this any
type ReactNode = any

export interface AtomRenderer<T> {
  render(): ReactNode

  loading(fn: () => ReactNode): this
  loadingKeep(): this
  ready(fn: (value: T) => ReactNode): this
  aborted(fn: (error: any) => ReactNode): this
}

export interface Atom<T> {
  readonly status: 'loading' | 'ready' | 'aborted'
  readonly value?: T
  readonly error?: any
  toPromise(): Promise<T>

  loading(fn: () => ReactNode): AtomRenderer<T>
  loadingKeep(): AtomRenderer<T>
  ready(fn: (value: T) => ReactNode): AtomRenderer<T>
  aborted(fn: (error: any) => ReactNode): AtomRenderer<T>

  useWhenLoading(onLoading: () => void | CleanupFunc): this
  useWhenReady(onReady: (value: T) => void | CleanupFunc): this
  useWhenAborted(onAborted: () => void | CleanupFunc): this
}

export function useAtom<T>(fetcher: Fetcher<[], T>, inputs?: any[]): Atom<T>

export function useAtom<T>(deps: [], fetcher: Fetcher<[], T>, inputs?: any[]): Atom<T>
export function useAtom<A, T>(deps: [Atom<A>], fetcher: Fetcher<[A], T>, inputs?: any[]): Atom<T>
export function useAtom<A, B, T>(
  deps: [Atom<A>, Atom<B>],
  fetcher: Fetcher<[A, B], T>,
  inputs?: any[],
): Atom<T>
export function useAtom<A, B, C, T>(
  deps: [Atom<A>, Atom<B>, Atom<C>],
  fetcher: Fetcher<[A, B, C], T>,
  inputs?: any[],
): Atom<T>
export function useAtom<A, B, C, D, T>(
  deps: [Atom<A>, Atom<B>, Atom<C>, Atom<D>],
  fetcher: Fetcher<[A, B, C, D], T>,
  inputs?: any[],
): Atom<T>
export function useAtom<A, B, C, D, E, T>(
  deps: [Atom<A>, Atom<B>, Atom<C>, Atom<D>, Atom<E>],
  fetcher: Fetcher<[A, B, C, D, E], T>,
  inputs?: any[],
): Atom<T>
export function useAtom<T>(deps: Atom<any>[], fetcher: Fetcher<any[], T>, inputs?: any[]): Atom<T>

export function useCombinedAtom(): Atom<[]>
export function useCombinedAtom<A>(a: Atom<A>): Atom<[A]>
export function useCombinedAtom<A, B>(a: Atom<A>, b: Atom<B>): Atom<[A, B]>
export function useCombinedAtom<A, B, C>(a: Atom<A>, b: Atom<B>, c: Atom<C>): Atom<[A, B, C]>
export function useCombinedAtom<A, B, C, D>(
  a: Atom<A>,
  b: Atom<B>,
  c: Atom<C>,
  d: Atom<D>,
): Atom<[A, B, C, D]>
export function useCombinedAtom<A, B, C, D, E>(
  a: Atom<A>,
  b: Atom<B>,
  c: Atom<C>,
  d: Atom<D>,
  e: Atom<E>,
): Atom<[A, B, C, D, E]>

export interface DeferredAtom<T> extends Atom<T> {
  sendValue(value: T)
  sendError(error: any)
}

export function useDeferredAtom<T = any>(inputs?: any[]): DeferredAtom<T>
