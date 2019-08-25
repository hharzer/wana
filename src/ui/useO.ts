import { useMemoOne as useMemo } from 'use-memo-one'
import { emptyArray, isFunction } from '../common'
import { Derived } from '../derive'
import { untracked } from '../global'
import { o } from '../o'
import { useDerived } from './useDerived'

/** Create a derived function that is managed by React. */
export function useO<T extends any[], U>(
  create: () => (...args: T) => U,
  deps?: readonly any[]
): Derived<T, U>

/** Create observable component state. */
export function useO<T>(
  create: () => Exclude<T, Function>,
  deps?: readonly any[]
): T

/** Memoize an object and return its observable proxy. Non-objects are returned as-is. */
export function useO<T>(state: Exclude<T, Function>, deps?: readonly any[]): T

/** @internal */
export function useO(state: any, deps?: readonly any[]) {
  const result = useMemo<any>(
    () => (isFunction(state) ? untracked(state) : state),
    deps || emptyArray
  )
  // Beware: Never switch between observable function and observable object.
  return isFunction(result) ? useDerived(result, [result]) : o(result)
}
