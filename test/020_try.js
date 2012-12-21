var CookyChain = require('cooky-chain');

var self = {name:'myself'};
CookyChain.try(function(){
    console.log('hello ' + this.name); // hello myself
}, self)
.next(function(){
    console.log('hello 2 ' + this.name); // hello myself
})
.next(function(){
    console.log('hello 3 ' + this.name); // hello yourself
}, {name:'yourself'})
.next(function(){
    console.log('hello 4 ' + this.name); // hello yourself
}, null);
;

