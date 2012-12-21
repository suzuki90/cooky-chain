var CookyChain = require('cooky-chain');

function echo(msg, callback){
    process.nextTick(function(){
        callback(null, msg);
    });
}

CookyChain.try(function(){
    echo('hello!', this.to('echo', ['msg']));
})
.next(function(across){
    console.log(across.echo.msg); // hello!
});

