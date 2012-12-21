var cc = require('cooky-chain');

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
