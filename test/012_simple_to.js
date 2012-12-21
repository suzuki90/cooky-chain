var cc = require('cooky-chain');

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

