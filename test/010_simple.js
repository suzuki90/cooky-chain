var cc = require('cooky-chain');

console.log('out block start');

cc.try(function(){
  console.log('try block');
})
.next(function(){
  console.log('next block');
})
.catch(function(){
  console.log('catch block');
})
.finally(function(){
  console.log('finally block');
});

console.log('out block end');
