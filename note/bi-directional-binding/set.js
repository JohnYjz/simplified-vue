/* 
新增属性也设置为响应式的
*/

Vue.prototype.$set = set;

function set(target, key, val) {
  // 若target是数组，调用splice这个响应式方法
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  // 若属性已经存在于target上，直接修改
  if (key in target && !(key in Object.prototype)){
    target[key] = val;
    return val;
  }
  const  ob = target.__ob__
  // 若target是vue实例，提示非法操作
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'product' && warn(
      'Avoid adding reactvie properties to a Vue instance or its root $data' +
      'at runtime - declare it upfront in the data option.'
    );
    return val;
  }
  // 若target不是响应式，直接赋值
  if(!ob) {
    target[key] = val
  }
  // 否则，调用响应式属性定义方法
  defineReactive(ob.value, key, val);
  // 在对象上新添加属性之前，多半已经定义了watcher，因此这里要手动通知依赖
  ob.dep.notify();
  return val;
}

