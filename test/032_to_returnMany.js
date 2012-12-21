var CookyChain = require('cooky-chain');

function echoTwo(msg, callback){
    process.nextTick(function(){
        callback(null, msg, msg);
    });
}

CookyChain.try(function(){
    echoTwo('hello!', this.to('echo', ['msg1', 'msg2']));
})
.next(function(across){
    console.log(across.echo.msg1); // hello!
    console.log(across.echo.msg2); // hello!
});
