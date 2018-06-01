import compose from './compose'

/**
 * 这个是用来扩展redux功能的
 * 中间件的作用是，在dispatch的时候，会按照在applyMiddleware时传入的中间件顺序，依次执行
 * 最后返回一个经过许多中间件包装之后的store.dispatch方法
 * @param {...Function} middlewares 接收不定数量的中间件
 * @returns {Function} 返回一个经过中间件包装之后的store
 */
export default function applyMiddleware(...middlewares) {
  //返回一个参数为createStore的匿名函数
  return (createStore) => (reducer, preloadedState, enhancer) => {
    //生成store
    const store = createStore(reducer, preloadedState, enhancer)
    //得到dispatch方法
    let dispatch = store.dispatch
    //定义中间件的chain
    let chain = []

    //在中间件中要用到的两个方法
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    }
    //把这两个api给中间件包装一次
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    //链式调用每一个中间件，给dispatch进行封装，再返回最后包装之后的dispatch
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
