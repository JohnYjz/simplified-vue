/* 
响应式delete
*/

Vue.prototype.$delete = del;

function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  
  const ob = target.__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'product' && warn(
      'Avoid deleting reactvie properties to a Vue instance or its root $data' +
      '- just set it to null.'
    )
    return;
  }

  if(!hasOwn(target, key)) {
    return;
  }

  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}