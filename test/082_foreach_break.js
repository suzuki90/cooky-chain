var CookyChain = require('cooky-chain');

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
