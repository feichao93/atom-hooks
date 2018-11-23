# atom-hooks

一个简单的、基于 React hooks 特性的异步数据管理工具。这个工具只是我个人的一项实验性的工作，API 随时可能发生变化，请小心使用。

## 目录

- [安装](#%E5%AE%89%E8%A3%85)
- [API](#api)
  - [`function useAtom(fetcher: Fetcher, inputs?: any[]): Atom`](#function-useatomfetcher-fetcher-inputs-any-atom)
  - [`function useAtom(dependencies: Atom[], fetcher: Fetcher, inputs?: any[]): Atom`](#function-useatomdependencies-atom-fetcher-fetcher-inputs-any-atom)
  - [`function useCombinedAtom(...atoms: Atom[]): Atom`](#function-usecombinedatomatoms-atom-atom)
  - [`function useDeferredAtom(inputs?: any[]): DeferredAtom`](#function-usedeferredatominputs-any-deferredatom)
- [Atom](#atom)
  - [Atom 接口](#atom-%E6%8E%A5%E5%8F%A3)
- [渲染器](#%E6%B8%B2%E6%9F%93%E5%99%A8)
  - [渲染器接口](#%E6%B8%B2%E6%9F%93%E5%99%A8%E6%8E%A5%E5%8F%A3)

## 安装

目前请使用 GitHub URL 的形式安装该类库，该类库目前导出 CommonJS 模块。

```json
{
  "name": "foo",
  "version": "0.0.0",
  "dependencies": {
    "atom-hooks": "shinima/atom-hooks"
  }
}
```

## API

该类库提供了 `useAtom`，`useCombinedAtom`，`useDeferredAtom` 这几个函数。

### `function useAtom(fetcher: Fetcher, inputs?: any[]): Atom`

使用 `fetcher` 创建一个 Atom 对象。

- `fetcher` 是一个异步函数，需要返回一个 Promise。当组件初次加载时，`fetcher` 将被调用。
- 当 `fetcher` 返回的 Promise 成功时，其 resolved value 将作为 Atom 的值，同时 Atom 的状态变为 ready；当该 Promise 失败时，其 rejected error 将作为 Atom 的值，同时 Atom 的状态变为 aborted。Atom 的初始状态为 loading。
- `inputs` 数组用于表示 Atom 的 _依赖_，每当 `inputs` 发生变化时，`fetcher` 将再次被调用，Atom 的状态会重置为 `loading`，并根据 `fetcher` 返回的新的 Promise 进行状态变化。参见 [React.useEffect](https://reactjs.org/docs/hooks-reference.html#conditionally-firing-an-effect)。

### `function useAtom(dependencies: Atom[], fetcher: Fetcher, inputs?: any[]): Atom`

参数 `dependencies` 是一个 Atom 的数组，用于声明 fetcher 的依赖，当所有 dependencies 中的所有 Atom 都进入 ready 状态时，fetcher 才会被调用。fetcher 被调用时的参数为 dependencies 对应的值。

`inputs` 参数中也可以包含 Atom，此时 inputs 的含义略有不同：当 inputs 中的 Atom 重新进入 loading 时，useAtom 返回的 Atom 会再次调用 fetcher 并重新进入 loading 状态。

```javascript
function Component({ uid }) {
  // 当前用户的信息
  const userInfoAtom = useAtom(() => loadUserInfo(uid), [uid])

  // 根据当前用户信息，获取到的第一位好友的信息
  const firstFriendAtom = useAtom(
    [userInfoAtom], // 声明 firstFriendAtom 的依赖
    userInfo => {
      // firstFriendAtom 的 fetcher 被调用时，可以拿到其所依赖的 Atom 的值
      const firstFriendUid = userInfo.friends[0].uid
      return loadUserInfo(firstFriendUid)
    },
    // inputs 中的 Atom：当 userInfoAtom 重新 loading 时，firstFriendAtom 也会重置为 loading 状态
    [userInfoAtom],
  )

  // ... ...
}
```

### `function useCombinedAtom(...atoms: Atom[]): Atom`

根据多个 Atom 中创建一个合并的 Atom（combinedAtom）。当所有的 Atom 均为 ready 时，combinedAtom 的状态才变为 ready，combinedAtom 的值为所有子 Atom 的值构成的数组；当有一个 Atom 出错时，combinedAtom 也进入出错状态；当有一个 Atom 仍处于加载状态时，combinedAtom 也处于加载状态。

### `function useDeferredAtom(inputs?: any[]): DeferredAtom`

创建一个 DeferredAtom 对象，该对象包含两个额外的方法用来主动控制 atom 的状态：`sendValue(value)` 使得 atom 主动进入 ready 状态，而 `sendError(erorr)` 则使得 atom 主动进入 aborted 状态。当 atom 处于 ready/abortd 状态时，调用这两个方法不会有任何效果。

## Atom

Atom 对象是一种异步数据的容器，被设计用来管理 React 组件中的异步数据。

使用 `useAtom()` 创建的 Atom 会与 fetcher 返回的 Promise 绑定：当 Promise resolve 或 reject 时，Atom 的状态会相应地变为 ready 或 aborted。 与 Promise 不同的是，当 inputs 数组改变的时候，fetcher 会被再次调用，Atom 的状态会被重置为 loading 然后绑定至 fetcher 返回的 Promise。

(TODO 需要再详细介绍 Atom 的概念和特性)

使用 `useCombinedAtom(...atoms)` 创建的 Atom 会与各个子 Atom 进行绑定，每当子 Atom 发生变化时，combinedAtom 也会做出相应的改变（和 [RxJS 的 `combineLatest()`](https://cn.rx.js.org/class/es6/Observable.js~Observable.html#static-method-combineLatest) 可以说是非常类似了）。

### Atom 接口

- `Atom#status`: Atom 的状态，可为 `'loading'` / `'ready'` / `'aborted'` 中的一种。
- `Atom#value`: 当 Atom 处于 `ready` 状态时表示 Atom 的值
- `Atom#error`: 当 Atom 处于 `aborted` 状态时表示 Atom 遇到的错误
- `Atom#loading(fn)`: 返回该 Atom 的一个渲染器，并将渲染器的 loading 渲染方法设置为 fn
- `Atom#loadingKeep()`: 返回该 Atom 的一个渲染器，并将渲染器的 loading 渲染方法设置为 `KEEP`
- `Atom#ready(fn)`: 返回该 Atom 的一个渲染器，并将渲染器的 ready 渲染方法设置为 fn
- `Atom#aborted(fn)`: 返回该 Atom 的一个渲染器，并将渲染器的 aborted 渲染方法设置为 fn
- `Atom#toPromise()`: 返回当前 Atom 对应的 Promise，用于与其他代码进行互操作
- `Atom#useWhenLoading(fn)`: 当 Atom 进入 loading 状态时，fn 将被调用，调用形式为 `fn()`。注意这是一个 React hook，需要符合 hook 的要求
- `Atom#useWhenReady(fn)`: 当 Atom 进入 ready 状态时，fn 将以 `fn(atom.value)` 的形式被调用。注意这是一个 React hook
- `Atom#useWhenAborted(fn)`: 当 Atom 进入 aborted 状态时，fn 将以 `fn(atom.error)` 的形式被调用。注意这是一个 React hook

## 渲染器

调用 Atom 对象的特定方法，会返回绑定该 Atom 的渲染器。一个渲染器包含了三个渲染方法，分别对应了 Atom 的状态，调用渲染器的 `render()` 方法时，渲染器将调用相应的渲染方法，返回 React Elements。渲染器采用了 _链式调用_ 风格 API，方便对不同的渲染方法进行配置。

### 渲染器接口

- `AtomRederer#render()`: 根据所绑定的 Atom 的状态，调用相应的渲染方法，返回渲染结果；调用渲染方法的形式分别为：
  - `loadingFn()`
  - `readyFn(atom.value)`
  - `abortedFn(atom.error)`
- `AtomRederer#loading(fn)`: 返回一个 loading 渲染方法被替换为 fn 的新的渲染器（其他渲染方法保持不变，绑定的 Atom 也不变）
- `AtomRederer#ready(fn)` / `AtomRederer#aborted(fn)`: 返回一个特定渲染方法被替换的新的渲染器
- `AtomRederer#loadingKeep()`: 返回一个 loading 渲染方法被设置为 KEEP 的新的渲染器

当 loading 渲染方法为 KEEP 时，若相应的 Atom 处于 loading 状态，`AtomRederer#render()` 将返回该渲染器上一次的渲染结果，保持界面不变。

## 使用示例

(TODO) Coming soon...
