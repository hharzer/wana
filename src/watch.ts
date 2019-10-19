import { isMap, isObject, isUndefined } from './common'
import { Change, ObservedState, ObservedValue, Observer } from './observable'
import { $O } from './symbols'

type WatchedState = ObservedState & {
  forEach?: (cb: (value: any, key: any, ctx: any) => void) => void
}

/** Watch an observable tree for changes */
export function watch(root: object, onChange: (change: Change) => void) {
  return new Watcher(root, onChange)
}

/** An observer of deep changes */
export class Watcher extends Observer {
  observed = new Set<ObservedValue>()
  counts = new Map<object, number>()

  constructor(readonly root: object, onChange: (change: Change) => void) {
    super()
    this.onChange = change => {
      const { op, target, key, value, oldValue } = change
      switch (op) {
        case 'replace':
          if (isObject(oldValue)) this._unwatch(oldValue)
        case 'add':
          this.watch(value, key, target)
          break
        case 'remove':
          this.unwatch(value, key, target)
          break
        case 'splice':
          value.forEach(this.watch)
        default:
          oldValue.forEach(this.unwatch)
      }
      onChange(change)
    }
    this._watch(root)
  }

  watch = (value: any, key?: any, ctx?: any) => {
    if (isObject(key) && isMap(ctx)) this._watch(key)
    if (isObject(value)) this._watch(value)
  }

  unwatch = (value: any, key?: any, ctx?: any) => {
    if (isObject(key) && isMap(ctx)) this._unwatch(key)
    if (isObject(value)) this._unwatch(value)
  }

  dispose() {
    if (this.onChange) {
      super.dispose()
      this.counts.clear()
    }
  }

  // Watch every observable in the given object.
  protected _watch(target: WatchedState) {
    const { counts } = this
    const count = counts.get(target) || 0
    counts.set(target, count + 1)
    if (!count) {
      if (target[$O]) {
        this.observed.add(target[$O]!.get($O).add(this))
      }
      if (!target.forEach) {
        target = Object.values(target)
      }
      target.forEach!(this.watch)
    }
  }

  // Unwatch every observable in the given object.
  protected _unwatch(target: WatchedState) {
    const { counts } = this
    const count = counts.get(target)
    if (isUndefined(count)) return
    if (count > 1) {
      counts.set(target, count - 1)
    } else {
      counts.delete(target)
      if (target[$O]) {
        const value = target[$O]!.get($O)
        this.observed.delete(value)
        value.delete(this)
      }
      if (!target.forEach) {
        target = Object.values(target)
      }
      target.forEach!(this.unwatch)
    }
  }
}
