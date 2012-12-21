var CookyChain = require('cooky-chain');

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
.catch(function(){
    console.log('catch');
});
