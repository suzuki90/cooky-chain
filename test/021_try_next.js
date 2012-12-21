var CookyChain = require('cooky-chain');

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


