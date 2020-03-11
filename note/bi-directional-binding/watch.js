/* 
之前的代码段是在dep对象中，添加watcher到dep.subs中

修改后，本节的代码段中
   为watcher定义addDep方法
      watcher.depIds 中存着 dep.id
      watcher.deps 则存着 dep，
      调用dep.addSub
   dep.depend 实际是调用 watcher.addDep方法

   即，所做的事情没有变，但是watcher记录了哪个Dep和watcher关联

watcher和dep是多对多的关系

watcher('a.b.c', cb)这种形式，watcher和dep基本上是一对一的
  定义了c，则创建了一个dep对象
  watcher了c，则创建了一个watcher对象，c的dep会把watcher收集起来


watcher(function() {
  return this.name + this.age;
}, function(newValue, oldValue) {
  console.log(newValue, oldValue);
});
对于这种形式，watcher则创建了一个
而name和age是被定义了两个，因此会有两个dep，这两个dep都会把这个watcher收集起来
而这个watcher同样也会把两个dep存起来

在watcher中记录所依赖的dep，其作用是unwatcher时，通知dep移除依赖

【问题】
什么时候需要调用unwatcher?
*/

Vue.prototype.$watch = function(expOrFn, cb, options) {
  const vm = this;
  options = options || {};
  const watcher = new watcher(vm, expOrFn, cb, options);
  // 如果immediate，则立即执行callback
  if (options.immediate) {
    cb.call(vm, watcher.value);
  }
  return function unwatchFn() {
    watcher.teardown();
  }
}

class watcher {
  constructor(vm, expOrFn, cb, options) {
    this.vm = vm;

    if(options) {
      this.deep = !!options.deep;
    } else {
      this.deep = false;
    }

    this.deps = [];
    this.depIds = new Set();
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn);
    }
    this.cb = cb;
    this.value = this.get();
  }
  get() {
    window.target = this;
    let value = this.getter.call(vm, vm);
    if(this.deep) {
      // 对所有的子属性执行一次读取操作
      traverse(value);
    }
  }
  addDep(dep) {
    const id = dep.id;
    if (!this.depIds.has(id)) {
      this.depIds.add(id);
      this.deps.push(dep);
      // this --- watcher
      dep.addSub(this);
    }
  }
  teardown() {
    let i = this.deps.length;
    while(i--) {
      this.deps[i].removeSub(this)
    }
  }
}

// parsePath的实现
// \w 匹配一个字母、数字、下划线
// .匹配一个任意字符
const bailRE = /[^\w.$]/
function parsePath(path) {
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split('.');
  return function(obj) {
    for (let index = 0; index < segments.length; index++) {
      if (!obj) return;
      obj = obj[segments[i]]
    }
    return obj;
  }
}

// 深度优先遍历临时用来标记该节点已经访问过
const seenObjects = new Set();

function traverse(val) {
  _traverse(val, seenObjects);
  seenObjects.clear();
}

// 一个深度优先遍历
function _traverse(val, seen) {
  let i, keys;
  const isA = Array.isArray(val);
  if((!isA && !isObject(val)) || Object.isFrozen(val)) {
    return;
  }
  // 如果是响应式的
  if(val.__ob__) {
    const depId = val.__ob__.dep.id;
    // 且已经记录了，则return
    if(seen.has(depId)) {
      return;
    }
    // 否则标记
    seen.add(depId);
  }
  // 注意这里，对其子节点执行了一次读取操作
  if (isA) {
    i = val.length;
    while(i--) _traverse(val[i], seen);
  } else {
    keys = Object.keys(val);
    i = keys.length;
    while(i--) _traverse(val[i], seen);
  }
}


let uid = 0;
class Dep {
  constructor() {
    this.id = uid++;
    this.subs = [];
  }

  depend() {
    if (window.target) {
      // window.target === watcher
      window.target.addDep(this);
    }
  }
  removeSub(sub) {
    const index = this.subs.indexOf(sub);
    if(index > -1) {
      return this.subs.splice(index, 1);
    }
  }
}