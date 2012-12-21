var CookyChain = require('cooky-chain');

CookyChain.try(function(){
    var msg = 'hello!';
    this.take('msg', msg);
})
.next(function(across){
    console.log(across.msg); // hello!
});


