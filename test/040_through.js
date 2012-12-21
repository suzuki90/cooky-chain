var CookyChain = require('cooky-chain');

function echo(msg, callback){
    process.nextTick(function(){
        callback(null, msg);
    });
}

CookyChain.try(function(){
    echo('hello!', this.through('echo', ['err', 'msg']));
})
.next(function(across){
    console.log(across.echo.err); // null
    console.log(across.echo.msg); // hello!
});


