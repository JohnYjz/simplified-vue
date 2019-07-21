/* 
假设有对象a，为其设置属性b，值为[1,2,3]
const a = {}
则调用defineReactvie(a, b, [1,2,3]);

此时用[1,2,3]创建一个observer对象
observer.value = [1,2,3]
observer.dep = new Dep();
且[1,2,3]被设置属性 __ob__， 即[1,2,3].__ob__ = observer
（无论value是对象还是数组，以上几步都会执行，如果是数组，则继续使用数组的每个元素创建observer对象）
*如果是数组，则会重写数组方法

对于数组来说，
若是对其定义监听，如
watch: {
  'a.b': function() {
    // do something
  }
}
这里会执行watcher的初始化操作，读取一次b并执行b的get()
则在进而将watcher塞入到defineReactive顶部定义的dep中，以及observer.dep中

若对a.b === [1,2,3] 这个数组执行push操作
首先b的set方法不会执行
但是b被重写的push方法会被执行，此时会调用this.ob.dep.notify();

但是什么时候重写push的？ - 创建observer对象的时候
__ob__是干啥用的 - 用来保存observer的，比如对于[1,2,3]，会用其生成一个observer，然后将其作为__ob__


总结一下
1、vue定义数组，比如 a: [1,2,3]
2、调用defineReactive
    (1)执行observer
      ->Observer([1,2,3])生成observer对象，
        其中
            observer.value = [1,2,3]
            observer.dep = new Dep()
        并令 [1,2,3].__ob__ = observer
        对于数组，还重写了数组[1,2,3]原型上的的push、pop、shift、unshift等方法
            若重写的方法被调用，除了调用原方法，还会调用[1,2,3].__ob__.dep.notify()通知依赖
    (2)调用Object.defineProperty(vue, a, [1,2,3])
        在get()中，调用observer.dep.depend()
    
      问题来了，get中调用的是observer.dep.depend()
      而observer中是将observer赋给了[1,2,3].__ob__
         __ob__是在哪些地方会用到呢？1、避免重复生成observer；2、在重写的数组方法中，会通过__ob__找到observer

3、设置监听watch，比如watch('a', callback);
   初始化对象watcher，watcher.value = a，watcher.cb = callback;
      初始化的过程中，会读一次a，从而触发a的get()，即observer.dep.depend()
          这其中的dep.depend()是将window.target === watcher存起来

4、若调用push方法，会执行
   会执行重写push->__ob__dep.nofity()->watcher.cb()

*/

function defineReactive(data, key, val) {
  let childOb = observe(val);
  let dep = new Dep();
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      dep.depend();
      if (childOb) {
        childOb.dep.depend();
      }
      return val;
    },
    set: function(newVal) {
      if (val === newVal) {
        return;
      }
      dep.notify();
      val = newVal;
    },
  });
}

// 创建一个observerd对象
function observe(value, asRootData) {
  if (!isObject(value)) {
    return;
  }
  let ob;
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else {
    ob = new Observer(value);
  }
  return ob;
}
// --- 这里的arrayMethods是重写后的
const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);

['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
  .forEach(function(method) {
    const original = arrayProto[method];
    // 这里的...args相当于arguments，但args是一个数组
    def(arrayMethods, method, function mutator(...args) {
      // 这里的this是什么，推测应该是传入的数组比如[1,2,3]
      const result = original.apply(this, args);
      const ob = this.__ob__;
      let inserted;
      switch(method) {
        case 'push':
        case 'unshift':
          inserted = args;
          break;
        case 'splice':
          // 即splice(0, 1, 'a', 'b', 'c')中的 'a' 'b' 'c'
          // 这里的inserted结果为['a', 'b', 'c'];
          inserted = args.slice(2);
          break;
      }
      if (inserted) ob.observeArray(inserted);
      ob.dep.notify();
      return result;
    });
  });
  // ---

const hasProto = '__proto__' in {};
// 即拿到 ['push', 'unshift', ...]
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

// 为每个
class Observer {
  constructor(value) {
    this.value = value;

    // 注意这里，Dep在这里也有一份
    this.dep = new Dep();

    // 定义 value.__ob__ = observer
    def(value, '__ob__', this);

    if (Array.isArray(value)) {
      const augment = hasProto ? protoAugment: copyAugument;
      augment(value, arrayMethods, arrayKeys);
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  }
  observeArray(items) {
    for (let index = 0; index < items.length; index++) {
      observe(items[index]);
    }
  }
}

function protoAugment(target, src, keys) {
  target.__proto__ = src
}

function copyAugument(target, src, keys) {
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    def(target, key, src[key]);
  }
}

function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true,
  });
}



