#### 调用说明
假设myObj的b属性要再定义一个c属性
```
const myObj = {
  a: {
    b: {
      c: 1,
    }
  }
}
```
首先，调用
`defineReactvie(a.b, c, 1);`
其中
`data === a.b, key === c, value === 1`
`Object.defineProperty(a.b, c, {...});`

之后，确定要监控的属性，比如c
```
watch: {
  'a.b.c': callback,
}
```
在使用$watch或者模板函数中，调用Watcher创建watcher对象
初始化watcher的对象，会记下来a.b.c是这个watcher要监听的变量，其对应的回调函数是callback
初始化watcher对象的过程中，会对a.b.c读取一次，并令window.target = watcher，此时会触发defineReactvie中的
```
Object.defineProperty(a.b, c, {
  get() {
    dep.depend();
    return val;
  }
});
```
其中dep.depend将window.target === watcher存了起来

若后续对c做出了赋值
如
`a.b.c = 2;`
则会调用c对应的set()方法，由于之前已经收集了watcher，这里调用dep.notify()实际就是在调用watcher的update()方法
```
set(newVal) {
  if (val === newVal) {
    return;
  }
  val === newVal;
  dep.notify();
}
```

#### 源码
```
function defineReactvie(data, key, val) {
  // 如果是对象，则递归调用defineReactvie()定义对象上的所有属性
  if (typeof val === 'object') {
    new Observer(val);
  }
  // 创建对象Dep, 初始化Dep.subs = [];
  let dep = new Dep();
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      // 在watcher初始化的时候，会指明要监听的对象，如a.b.c
      // 在指明监听对象的时候，会对.c读取以此，进而触发这里的get
      // 在读取.c的时候会把watcher赋值给window.target
      dep.depend();
      return val;
    },
    set: function(newVal) {
      if (val === newVal) {
        return;
      }
      val === newVal;
      dep.notify();
    },
  });
}

class Observer {
  constructor(value) {
    this.value = value;
    if (!Array.isArray(value)) {
      this.walk(value);
    }
  }
  walk(obj) {
    const keys = Object.keys(obj);
    for (let index = 0; index < keys.length; index++) {
      defineReactvie(obj, keys[i], obj[keys[i]]);
    }
  }
}

class Dep {
  constructor() {
    this.subs = [];
  }
  addSub(sub) {
    this.subs.push(sub);
  }
  removeSub(sub) {
    remove(this.subs, sub);
  }
  depend() {
    if (window.target) {
      this.addSub(window.target);
    }
  }
  notify() {
    const subs = this.subs.slice();
    for (let index = 0; index < subs.length; index++) {
      subs[index].update();
    }
  }
}
function remove(arr, item) {
  if(arr.length) {
    // item是什么，能这样查找到吗
    const index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1);
    }
  }
}

class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm;
    // getter是一个函数，顺着数据进行读取操作
    this.getter = parsePath(expOrFn);
    this.cb = cb;
    this.value = this.get();
  }
  get() {
    window.target = this;
    let value = this.getter.call(this.vm, this.vm);
    window.target = undefined;
    return value;
  }
  udpate() {
    const oldValue = this.value;
    this.value = this.get();
    this.cb.call(this.vm, this.value, oldValue);
  }
}

// parsePatch的实现
// \w 匹配一个字母、数字、下划线
// .匹配一个任意字符
const bailRE = /[^\w.$]/
export function parsePath(path) {
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
```