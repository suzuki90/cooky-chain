cooky-chain
==============

Like synchronization how to write library in node.js  
cooky-chainはnode.jsで Like synchronize & Like try-catch な Codingを提供します。

## Simple Example
以下が最も単純なコードです。

```js
var CookyChain = require('cooky-chain');

console.log('out block start');

CookyChain.try(function(){
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

__Output__
```js
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
この機能はLike throwであり、内部処理でも本当のthrowはしません。

```js
CookyChain.try(function(){
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

__Output__
```js
try block start
try block end
catch block -> an exception ...At throwExample.js:3:15
finally block
```

throw()の後の'try block end'が出力されていることに注意してください。  
throw()はfunctionをexitしません。  
これを解決するために、returnと合わせて使用してください。

```js
CookyChain.try(function(){
    console.log('try block start');
    return this.throw('an exception');
    console.log('try block end');
})
```

## Like synchronize Example

cooky-chainの重要な機能としてto()があります。
これにより、非同期関数を使用しつつ同期的なコーディングを実現します。

```js
function asyncFunc(callback){
    console.log('asyncFunc start');
    process.nextTick(function(){
        console.log('asyncFunc end');
        callback(null, 'hello!');
    });
}

CookyChain.try(function(){
    console.log('try block');
    asyncFunc(this.to('func', ['msg']));
})
.next(function(across){
    console.log('next block -> ' + across.func.msg);
});
```

__Output__
```js
try block
asyncFunc start
asyncFunc end
next block -> hello!
```

## Documentation

### Collections

* [try](#try)
* [next, catch, finally](#next)
* [to](#to)
* [through](#through)
* [take](#take)
* [enter, exit](#enter)
* [delegate](#delegate)
* [foreach](#foreach)
* [continue, break](#continue)

## Collections

<a name="try" />
### try(func, caller)

CookyChainの一連の処理を開始します。

__Arguments__
* func - 処理を行うためのfunction
* caller - func内でのthisでアクセスするオブジェクト
  
requireしたCookyChainから直接呼び出すことができるfunctionは唯一これだけです。  
try以外のfunctionはtryの戻り値、または（callerがundefindedの場合は）func内のthisから呼び出すことができます。  
callerを指定した場合、func内でthisを使用した時にそのcallerへアクセスされるようになります。  
この効果は next, catch, finally にも影響し、再びcallerかnullが指定されるまで続きます。  

__Example__
```js
var self = {name:'myself'};
CookyChain.try(function(){
    console.log('hello ' + this.name); // hello myself
}, self)
.next(function(){
    console.log('hello ' + this.name); // hello myself
})
.next(function(){
    console.log('hello ' + this.name); // hello yourself
}, {name:'yourself'});
.next(function(){
    console.log('hello ' + this.name); // hello undefinded (this = CookyChain)
}, null);
```

<a name="next" />
### next(func, caller), catch(func), finally(func)

既にExpmaleで見たとおりです。  
next - エラーが発生している場合はfuncが実行されません。  
catch - エラーが発生している場合だけfuncが実行されます。  
finally - エラーの発生に関係なくfuncが実行されます。  
  
nextだけでなく catch, finally も複数回chainすることが可能です。  
また catchのfuncが実行された時点で一度エラー発生情報がリセットされるため、たとえば以下のようなことができます。

__Example__
```js
var result, retry;
CookyChain.try(function(){
    if (Math.random() * 2 > 1) return this.throw('an exception');
})
.next(function(){ result = true; })
.catch(function(err){ result = false; })
.finally(function(){ console.log(result ? 'good!' : 'bad...'); })
.next(function(){
    if (result) return;
    retry = true;
    console.log('try again!');
    if (Math.random() * 2 > 1) return this.throw('an exception');
})
.next(function(){ result = true; })
.catch(function(err){ result = false; })
.finally(function(){
    if (retry) console.log(result ? 'all ok!' : ':-p');
});
```

<a name="to" />
### to(name, argNames, err)

非同期関数の戻り値（コールバックで渡される値）をnextへ渡すためのコールバック関数を返します。  
非同期関数の戻り値の第一引数（err）を自動でチェックして、nullでなければ自動でthrowします。  
この機能により、コーダーは自分でerrをチェックする必要が無くなります。errを自分でチェックしたい場合は[through](#through)を使用してください。

__Arguments__
* name - 識別するための名前です。
* argNames - 非同期関数がコールバックする時の引数名の配列です。（たいていの）第一引数の'err'を自動で補完するので、省略してください。
* err - nullでなければ本来のerrに追加されます。

toを実行した次のnextには引数で連想配列（便宜的にacrossとします）が渡され、to実行時に指定したnameから戻り値にアクセスできます。

__Example__
```js
function echo(msg, callback){
    process.nextTick(function(){
        callback(null, msg);
    });
}

CookyChain.try(function(){
    echo('hello!', this.to('echo', ['msg']));
})
.next(function(across){
    console.log(across.echo.msg); // hello!
});
```

toの実行は同じnext内で複数行えます。  
その場合に、それぞれの非同期関数は並列（parallel）に実行されます。

__Example__
```js
function echo(msg, callback){
    process.nextTick(function(){
        callback(null, msg);
    });
}

CookyChain.try(function(){
    echo('hello!', this.to('echo1', ['msg']));
    echo('world!', this.to('echo2', ['msg']));
})
.next(function(across){
    console.log(across.echo1.msg); // hello!
    console.log(across.echo2.msg); // world!
});
```

非同期関数の戻り値が複数ある場合は、その分だけargNamesに指定してください。

__Example__
```js
function echoTwo(msg, callback){
    process.nextTick(function(){
        callback(null, msg, msg);
    });
}

CookyChain.try(function(){
    echoTwo('hello!', this.to('echo', ['msg1', 'msg2']));
})
.next(function(across){
    console.log(across.echo.msg1); // hello!
    console.log(across.echo.msg2); // hello!
});
```

<a name="through" />
### through(name, argNames)

基本的な部分は[to](#to)と変わりません。
toと異なる点は戻り値の第一引数をチェックせず、補完もしないことです。

__Arguments__
* name - 識別するための名前です。
* argNames - 非同期関数がコールバックする時の引数名の配列です。'err'を補完しませんので必要に応じて指定してください。

__Example__
```js
function echo(msg, callback){
    process.nextTick(function(){
        callback(null, msg);
    });
}

CookyChain.try(function(){
    echo('hello!', this.through('echo', ['err', 'msg']));
})
.next(function(across){
    console.log(across.echo.err); // null
    console.log(across.echo.msg); // hello!
});
```

<a name="take" />
### take(name, value)

値をnextへ渡します。

__Arguments__
* name - 識別するための名前です。
* value - 渡す値です。

__Example__
```js
CookyChain.try(function(){
    var msg = 'hello!';
    this.take('msg', msg);
})
.next(function(across){
    console.log(across.msg); // hello!
});
```

<a name="enter" />
### enter(caller), exit()

CookyChainをネストしたい場合に、これらのfunctionを使用します。  
exitは[throw](#throw)同様にreturnと併用してください。
また、ネストされたnextの実行は非同期に行われます。

__Example__
```js
CookyChain.try(function(){
    console.log('outer next 1 start');
    this.enter().next(function(){
        console.log('inner next 1');
        return this.exit();
    })
    .next(function(){
        console.log('inner next 2');
    });
    console.log('outer next 1 end');
})
.next(function(across){
    console.log('outer next 2');
});
```

__Output__
```js
outer next 1 start
outer next 1 end
inner next 1
outer next 2
```

注意点として、throwはネストに関係なく次のcatchまで進みます。

__Example__
```js
CookyChain.try(function(){
    this.enter().next(function(){
        console.log('inner next 1');
        return this.throw('an exception');
    })
    .next(function(){
        console.log('inner next 2');
    });
})
.next(function(across){
    console.log('outer next 2');
})
.catch(function{
    console.log('catch');
});
```

__Output__
```js
inner next 1
catch
```

<a name="delegate" />
### delegate()

通常、nextの実行は自動で行われますが、それを任意に実行したい場合にこのfunctionを使用します。  
delegate実行時に渡される引数は配列としてnextに渡ってきます。

__Example__
```js
function echo(msg, delegate){
    process.nextTick(function(){
        delegate(null, msg);
    });
}

CookyChain.try(function(){
    var delegate = this.delegate();
    echo('hello!', delegate);
})
.next(function(across){
    console.log(across[0]); // null
    console.log(across[1]); // hello!
});
```

Exampleのような場合は[to](#to)でこと足りるでしょう。基本的には[to](#to)の使用してください。  
delegateが使用されるケースとして、同一next内でtoを実行した後に、そのtoに関係なくnextに進みたい場合が考えられます。

<a name="foreach" />
### foreach()

配列、または連想配列の要素を順次処理したい場合に使用します。  
要素毎のキーが'across.key'として、値が'across.value'として渡されます。  
finallyブロックは必須ではありません。

__Arguments__
* list - 順次実行する配列、または連想配列です。

__Example__
```js
CookyChain.try(function(){
    var list = ['a', 'b', 'c'];
    this.foreach(list)
    .next(function(across){
        var idx = across.key;
        var value = across.value;
        console.log('next1 -> ' + idx + ' : ' + value);
    })
    .next(function(){
        console.log('next2');
    })
    .finally(function(){
        console.log('finally');
    });
})
.next(function(across){
    console.log('outer next');
});
```

__Output__
```js
next1 -> 0 : a
next2
next1 -> 1 : b
next2
next1 -> 2 : c
next2
finally
outer next
```

<a name="continue" />
### continue()

[foreach](#foreach)内で使用すると、あなたが思っているような動作をします。  
ただし[throw](#throw)と同様にreturnと併用することに注意してください。  

__Example__
```js
CookyChain.try(function(){
    var list = ['a', 'b', 'c'];
    this.foreach(list)
    .next(function(across){
        var idx = across.key;
        var value = across.value;
        if (idx == 1) return this.continue();
        console.log('next1 -> ' + idx + ' : ' + value);
    })
    .next(function(){
        console.log('next2');
    })
    .finally(function(){
        console.log('finally');
    });
})
.next(function(across){
    console.log('outer next');
});
```

__Output__
```js
next1 -> 0 : a
next2
next1 -> 2 : c
next2
finally
outer next
```

### break()

[continue](#continue)と同様です。

__Example__
```js
CookyChain.try(function(){
    var list = ['a', 'b', 'c'];
    this.foreach(list)
    .next(function(across){
        var idx = across.key;
        var value = across.value;
        if (idx == 1) return this.break();
        console.log('next1 -> ' + idx + ' : ' + value);
    })
    .next(function(){
        console.log('next2');
    })
    .finally(function(){
        console.log('finally');
    });
})
.next(function(across){
    console.log('outer next');
});
```

__Output__
```js
next1 -> 0 : a
next2
finally
outer next
```
