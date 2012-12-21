var CookyChain = require('cooky-chain');

function echo(msg, delegate){
    process.nextTick(function(){
        delegate(null, msg);
    });
}

CookyChain.try(function(){
    var delegate = this.delegate();
    echo('hello!', delegate);
})
.next(function(across){
    console.log(across[0]); // null
    console.log(across[1]); // hello!
});

