//使用dispatch包装actionCreator方法
function bindActionCreator(actionCreator, dispatch) {
  return (...args) => dispatch(actionCreator(...args))
}

/**
 *这个函数主要的作用就是：将action与dispatch函数绑定，生成直接可以触发action的函数
 *
 * @param {Function|Object} actionCreators
 *
 * @param {Function} dispatch 
 *
 * @returns {Function|Object}
 * 
 */
export default function bindActionCreators(actionCreators, dispatch) {
  //actionCreators为函数，就直接调用bindActionCreator包装
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
      `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  //以下是actionCreators为对象时的操作
  //遍历actionCreators对象的key值
  const keys = Object.keys(actionCreators)
  //存储dispatch和actionCreator绑定之后的集合
  const boundActionCreators = {}
  //遍历每一个对象，一一进行绑定
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}
