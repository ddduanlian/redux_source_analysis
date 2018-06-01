import isPlainObject from 'lodash/isPlainObject'
import $$observable from 'symbol-observable'

//定义初始化的action
export const ActionTypes = {
  INIT: '@@redux/INIT'
}

/**传入三个参数
 * @param {Function} reducer 一个函数，传入state和action参数，计算之后返回下一个state树
 *
 * @param {any} [preloadedState]  初始化的state
 *
 * @param {Function} [enhancer] enhancer就是applyMiddleware的结果，这个参数是在redux3.1.0之后才加入的
 *
 * @returns {Store} 返回的是一颗状态树 store
 */
export default function createStore(reducer, preloadedState, enhancer) {
  //这里是一些参数校验
  //如果第二个参数为函数且没有传入第三个参数，那就交换第二个参数和第三个参数
  //意思是createSotre会认为你忽略了preloadedState，而传入了一个enhancer
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    //如果传入了第三个参数，但不是一个函数，就报错
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    //这是一个高阶函数调用方法。这里的enhancer就是applyMiddleware(...middlewares)
    //enhancer接受createStore作为参数，对createStore的能力进行增强，并返回增强后的createStore
    //然后再将reducer和preloadedState作为参数传给增强后的createStore，得到最终生成的store
    return enhancer(createStore)(reducer, preloadedState)
  }

  //reducer不是函数，报错
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  //声明一些变量
  let currentReducer = reducer //当前的reducer函数
  let currentState = preloadedState//当前的状态树
  let currentListeners = [] // 当前的监听器列表
  let nextListeners = currentListeners //未来的监听器列表
  let isDispatching = false //是否正在dispatch

  //判断当前的listener是否和下一个listener是否是同一个引用
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   *
   * @returns {any} The current state tree of your application.
   */
  //返回当前的状态树
  function getState() {
    return currentState
  }

  /**
   *这个函数式给store添加监听函数，把listener作为一个参数传入，
   *注册监听这个函数之后，subscribe方法会返回一个unsubscribe()方法，来注销刚才添加的监听函数
   * @param {Function} listener 传入一个监听器函数
   * @returns {Function} 
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }
    //注册监听
    let isSubscribed = true

    ensureCanMutateNextListeners()
    //将监听器压进nextListeners队列中
    nextListeners.push(listener)

    //注册监听之后，要返回一个取消监听的函数
    return function unsubscribe() {
      //如果已经取消监听了，就返回
      if (!isSubscribed) {
        return
      }
      //取消监听
      isSubscribed = false

      //在nextListeners中找到这个监听器，并且删除
      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   *
   * @param {Object} action 传入一个action对象
   *
   * @returns {Object} 
   * 
   */
  function dispatch(action) {
    //校验action是否为一个原生js对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    //校验action是否包含type对象
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }

    //判断是否正在派发，主要是避免派发死循环
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    //设置正在派发的标志位，然后将当前的state和action传给当前的reducer，用于生成新的state
    //这就是reducer的工作过程，纯函数接受state和action，再返回一个新的state
    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    //得到新的state之后，遍历当前的监听列表，依次调用所有的监听函数，通知状态的变更
    //这里没有把最新的状态作为参数传给监听函数，是因为可以直接调用store.getState（）方法拿到最新的状态
    const listeners = currentListeners = nextListeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    //返回action
    return action
  }

  /**
   *这个方法主要用于reducer的热替换，一般不会使用
   * @param {Function} nextReducer 
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }
    // 把传入的nextReducer给当前的reducer
    currentReducer = nextReducer
    //dispatch一个初始action
    dispatch({ type: ActionTypes.INIT })
  }

  /**
   * 用于提供观察者模式的操作
   * @returns {observable} A minimal observable of state changes.
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer 
       * 观察者应该有next方法
       * @returns {subscription} 
       */
      subscribe(observer) {
        //观察者模式的链式结构，传入当前的state
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        //获取观察者的状态
        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        //返回一个取消订阅的方法
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
