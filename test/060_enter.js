var CookyChain = require('cooky-chain');

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
.next(function(){
    console.log('outer next 2');
});
