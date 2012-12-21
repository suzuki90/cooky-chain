var CookyChain = require('cooky-chain');

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
