cooky-chain
==============

Like synchronization how to write library in node.js  
cooky-chainはnode.jsで Like synchronize & Like try-catch な Codingを提供します。

## Simple Example
以下が最も単純なコードです。

```javascript
var cc = require('cooky-chain');

console.log('out block start');

cc.try(function(){
    console.log('try block');
})
.next(function(){
    console.log('next block');
})
.catch(function(err){
    console.log('catch block');
})
.finally(function(){
    console.log('finally block');
});

console.log('out block end');
```

### Output
```javascript
out block start
out block end
try block
next block
finally block
```

try → next → finallyの順に実行されます。  
注意として、try～finallyはnextTickで実行されるため、'out block end'の出力が先に実行されます。  
また、必須ブロックはtryだけであり next, catch, fanally は省略可能です。

## Throw Example
Like throwな機能があります。
throwされたerrには単純なエラー発生位置情報が付与されます。

```javascript
cc.try(function(){
    console.log('try block start');
    this.throw('an exception');
    console.log('try block end');
})
.next(function(){
    console.log('next block');
})
.catch(function(err){
    console.log('catch block -> ' + err);
})
.finally(function(){
    console.log('finally block');
});
```

### Output
```javascript
try block start
try block end
catch block -> an exception ...At throwExample.js:3:15
finally block
```

throw()の後の'try block end'が出力されていることに注意してください。  
throw()はfunctionをexitしません。  
これを解決するために、returnと合わせて使用してください。

```javascript
cc.try(function(){
    console.log('try block start');
    return this.throw('an exception');
    console.log('try block end');
})
```

## Like synchronize Example

cooky-chainの最も重要な機能としてto()があります。
これにより、非同期関数を使用しつつ同期的なコーディングを実現します。

```javascript
function asyncFunc(callback){
    console.log('asyncFunc start');
    process.nextTick(function(){
        console.log('asyncFunc end');
        callback(null, 'hello!');
    });
}

cc.try(function(){
    console.log('try block');
    asyncFunc(this.to('func', ['msg']));
})
.next(function(across){
    console.log('next block -> ' + across.func.msg);
});
```

### Output
```javascript
try block
asyncFunc start
asyncFunc end
next block -> hello!
```

