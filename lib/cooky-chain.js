/**
 * cooky-chain
 *
 * Like synchronization how to write library in node.js
 */
var Module = function(){};

/**
 * ruquire時設定
 *
 * @param  module.parent.exports.args {
 *             isDebugMode : デバッグモードか
 *             toWaitTime  : to()の最大待ち時間(単位：秒)
 *         }
 */
var moduleParentExportsArgs = module.parent.exports.args || {};
var IS_DEBUG_MODE = moduleParentExportsArgs.isDebugMode || false;
var TO_NEXT_WAIT_TIME = (moduleParentExportsArgs.toWaitTime !== undefined) ? moduleParentExportsArgs.toWaitTime * 1000 : 10000;

// 状態
var STATE_OK = 'o';
var STATE_NG = 'n';

// 実行後処理指定
var EXEC_NONE     = 0;
var EXEC_NEXT     = 1;
var EXEC_AGAIN    = 2;
var EXEC_CONTINUE = 3;
var EXEC_BREAK    = 4;

/**
 * try
 */
module.exports.try = function(func) {
    var root = new Module;
    root._root = root;
    root._state = STATE_OK;
    root._err = undefined;
    root._errDepths = {};
    root._depth = 1;
    root._depths = [1];
    root._caller = null;
    root._funcs = {};
    root._funcs[STATE_OK] = func;

    if (IS_DEBUG_MODE) {
        root._benchTimeMemo = (new Date).getTime();
        root._benches = [];
    }

    // 次回nextTickでfunc実行
    process.nextTick(function(){root._exec()});

    return root;
}

/**
 * next
 */
Module.prototype.next = function(func, depth, caller) {
    var self = this;
    var next = new Module;
    var root = next._root = self._root;
    if (self._next) next._next = self._next;
    self._next = next;
    self._args = null;
    next._depth = depth || self._depth;
    next._caller = caller || self._caller;
    next._originFunc = func || function(){};
    next._delegateNext = self._delegateNext;
    next._funcs = {};
    next._funcs[STATE_NG] = function(){};
    next._funcs[STATE_OK] = function(args) {
        args = next._args || args || null;

        // エラーが発生したら即抜ける
        if (root._state == STATE_NG) return EXEC_NEXT;

        // 自身の実行階層でなければ即抜ける
        if (next._depth != root._depths[root._depths.length - 1]) return EXEC_NEXT;

        // to()で待っている処理が全て完了しているか
        if (next._numOfTo === undefined || (next._numOfTo === 0)) {

            // to()の戻り値を設定
            if (next._numOfTo === 0) {
                args = args || {};
                next._numOfTo = undefined;
                for (var key in next._args) {
                    args[key] = next._args[key];
                }
            }

            // 準備ができたので改めてユーザー定義の関数を実行
            next._funcs[STATE_OK] = next._originFunc;
            next._args = args
            return EXEC_AGAIN;
        }
        else {
            // 規定時間経っても完了しない場合はエラーにする
            if (IS_DEBUG_MODE && (new Date).getTime() - self._toStartTime > TO_NEXT_WAIT_TIME) {
                self.throw('toコールバックの待機時間が規定時間を超えました');
                return EXEC_NEXT;
            }

            // 全て完了していないようなので少し待つ
            process.nextTick(function(){next._exec()});
            return EXEC_NONE;
        }
    };

    return next;
}

/**
 * catch
 */
Module.prototype.catch = function(func) {
    var next = new Module;
    next._isCatch = true;
    next._root = this._root;
    next._caller = this._caller;
    next._depth = this._depth;
    next._funcs = {};
    next._funcs[STATE_OK] = function(){};
    next._funcs[STATE_NG] = function(){
        next.clear();
        func.call(next.caller || next, arguments[0]);
    };
    this._next = next;
    return next;
}

/**
 * finally
 */
Module.prototype.finally = function(func) { 
    var next = new Module;
    next._isFinally = true;
    next._root = this._root;
    next._caller = this._caller;
    next._depth = this._depth;
    next._funcs = {};
    next._funcs[STATE_OK] = func;
    next._funcs[STATE_NG] = func;
    this._next = next;
    return next;
}

/**
 * 非同期処理の戻り値をnextへ繋ぐためのコールバック
 *
 * @param  name    : 識別するための名前
 * @param  argList : コールバックの引数のリストの文字列、ただし（たいていの）第一引数のerrは自動で補完するので含めない
 * @param  err     : エラー時のメッセージ、無ければデフォルトのものが使用される
 * @example
 *     next(function(){
 *         fs.readFile('example.txt', this.to('read', ['data']));
 *     })
 *     .next(function(across){
 *         // toで名付けたキー'read'にコールバックで渡された値が連想配列として入る
 *         var err  = across.read.err;
 *         var data = across.read.data;
 *     });
 * @note  コールバックの第一引数はerrだという前提で、自動でチェックを行いthrow()する
 */
Module.prototype.to = function(name, argNames, err) {
    var self = this;
    argNames = (argNames) ? ['err'].concat(argNames) : ['err'];
    return self._to(name, argNames, function(args){
        if (args[0] !== null) self.throw(args[0] + (err ? ' ' + err : '') + " ...At to('" + name + "')", false);
    });
}

/**
 * 非同期処理の戻り値をnextへ繋ぐためのコールバック（エラーチェック無し、連想配列ではない）
 *
 * @param  name
 * @param  argNames : コールバックの引数リストの配列、errは補完しない
 * @example
 *     next.(function(){
 *         fs.readFile('example.txt', this.through('read', ['err', 'data']));
 *     }).next(function(across){
 *         var err  = across.read.err;
 *         var data = across.read.data;
 *     });
 */
Module.prototype.through = function(name, argNames) {
    return this._to(name, argNames);
}

/**
 * 変数をnextへ繋ぐ
 *
 * @param  name
 * @param  value
 * @example
 *     next.(function(){
 *         this.take('say', 'hello!');
 *     }).next(function(across){
 *         console.log(across.say); // hello!
 *     });
 */
Module.prototype.take = function(name, value) {
    if (!this._next._args) this._next._args = {};
    this._next._args[name] = value;
}

/**
 * 非同期処理の戻り値をerrorへ繋ぐためのコールバック
 *
 * @param  name
 */
Module.prototype.toError = function(name) {
    name = name || 'noName';
    var self = this;
    return function(err){
        self.throw(err + " ...At toError('" + name + "')", false)
    };
}

/**
 * 次の階層に入る
 *
 * @param caller : その階層でthisとするオブジェクト
 */
Module.prototype.enter = function(caller) {
    if (this._depth > 20) {
        this.throw('Module::enter()の階層が規定数を超えました', true, 4);
        return this;
    }
    var enterDepth = this._depth + 1;
    for (var idx in this._root._depths) {
        if (enterDepth < this._root._depths[idx]) enterDepth = this._root._depths[idx] + 1;
    }
    this._root._depths.push(enterDepth);
    var next = this.next(function(){}, enterDepth, caller);
    next._depth = enterDepth;
    return next;
}

/**
 * 現在の階層を抜ける
 *
 * @note  現在の関数を抜けるわけではないので注意する。
 */
Module.prototype.exit = function(){
    for (var idx in this._root._depths) {
        if (this._depth == this._root._depths[idx]) {
            this._root._depths.splice(idx, 1);
            break;
        }
    }
    // 処理中のコールバックの戻りを待たずに先に進む（処理を中断するわけではない）
    this._numOfTo = undefined;
    return EXEC_NEXT;
}

/**
 * エラーを発生させる
 *
 * @example
 *     if (false) {
 *         return this.throw('an error');
 *     }
 * @note  現在の関数を抜けるわけではないので注意する
 */
Module.prototype.throw = function(err, isAddLine, atIndex) {

    isAddLine = (isAddLine !== undefined) ? isAddLine : true;
    atIndex = (atIndex !== undefined) ? atIndex : 3;

    // 発生行を取得
    var line = '';
    if (isAddLine) {
        var e =  Error("DUMMY");
        var stacks = (e.stack.split(/[\r\n]+/));
        line = stacks[atIndex].substring(0, stacks[atIndex].lastIndexOf(')'));
        line = ' ...At ' + line.substring(line.lastIndexOf('(') + 1);
    }

    // エラーを設定
    var root = this._root;
    if (root && root._state && root._state == STATE_OK && !(this._depth in root._errDepths)) {
        root._errDepths[this._depth] = true;
        root._state = STATE_NG;
        root._err = err + line;
    }

    // 上の階層へ抜ける
    this.exit();

    // delegateしている場合は自動で処理を実行
    if (this._delegateNext) {
        this._delegateNext._exec();
        return EXEC_NONE;
    }
    else {
        return EXEC_NEXT;
    }
}

/**
 * エラーを解除する
 */
Module.prototype.clear = function(){
    var root = this._root;
    root._state = STATE_OK;
    root._err = undefined;
}

/**
 * 現在実行中のnextを取得する
 */
Module.prototype.now = function(){
    return this._root._now;
}

/**
 * 次nextの実行を手動にする
 *
 * @example
 *         var myDelegate = this.delegate();
 *         process.nextTick(function(){
 *             myDelegate(1, 2, 3);
 *         });
 *     })
 *     .next(function(across){
 *         console.log(across[0], across[1], across[2]); // 1 2 3
 * @note 次nextを実行した場合、そのnextより深い階層のnextは以降実行されなくなる
 */
Module.prototype.delegate = function () {
    var next = this._next;
    this._next = null;
    this._delegateNext = next;
    return function(){
        // 対象nextが実行されるようにの深度調整
        var isFind = false;
        for (var idx in next._root._depths) {
            if (next._depth == next._root._depths[idx]) {
                next._root._depths = next._root._depths.slice(0, +idx + 1);
                isFind = true;
                break;
            }
        }
        if (!isFind) next._root._depths.push(next._depth);
        next._args = Array.prototype.slice.call(arguments);
        next._exec();
    };
}

/**
 * 配列を順次実行
 *
 * @param  list : 順次実行する配列
 * @example
 *     var list = [1:'a', 2:'b', 3:'c'];
 *     this.foreach(list)
 *     .next(function(across){
 *         console.log(across.key + ' : ' + across.value);
 *     })
 *     // finallyは省略可能
 *     .finally(function(){
 *         console.log('finally');
 *     });
 *
 *     // 結果
 *     1 : a
 *     2 : b
 *     3 : c
 *     finally
 */
Module.prototype.foreach = function(list) {
    var originNext = this._next;
    var keys = [];
    for (var key in list) {
        keys.push(key);
    }
    var each = this.enter().next(function(){
        // ループ間のnextを取得
        var funcs = [];
        var loopLast = each._next;
        while (loopLast._next && !loopLast._next._isFinally && loopLast._next._depth == each._depth) {
            funcs.push(loopLast._originFunc);
            loopLast = loopLast._next;
        }
        funcs.push(loopLast._originFunc);
        // finallyが無ければダミーを作成しておく
        var loopFinal = loopLast._next;
        if (!loopFinal || !loopFinal._isFinally) {
            loopFinal = loopLast.finally(function(){});
        }
        loopFinal._next = originNext;
        // 配列が空ならfinallyまでスキップ
        if (keys.length == 0) {
            return loopFinal;
        }
        // ループ繰り返し用のnextを挿入
        var loopLoop = loopLast.next(function(){
            if (keys.length > 0) {
                // ループ間のnextを総入れ替え
                each._next = loopLoop;
                var next = each;
                funcs.forEach(function(func){
                    next = next.next(func);
                });
                var loopFirst = each._next;
                // 引数設定
                var key = keys.shift();
                loopFirst._args = {
                    key   : key,
                    value : list[key],
                }
                return each._next;
            }
        });
        loopLoop._isLoop = true;
        // ループ最初の引数を設定
        var key = keys.shift();
        each._next._args = {
            key   : key,
            value : list[key],
        };
    });
    return each;
}

/**
 * ループ系をcontinue
 *
 * @example
 *     var list = [1:'a', 2:'b', 3:'c'];
 *     this.foreach(list)
 *     .next(function(across){
 *         console.log('one_' + across.key);
 *         if (across.key == 2) return this.continue();
 *     })
 *     .next(function(across){
 *         console.log('two');
 *     })
 *     .finally(function(){
 *         console.log('finally');
 *     });
 *
 *     // 結果
 *     one_1
 *     two
 *     one_2
 *     one_3
 *     two
 *     finally
 */
Module.prototype.continue = function() {
    return EXEC_CONTINUE;
}

/**
 * ループ系をbreak
 *
 * @example
 *     var list = [1:'a', 2:'b', 3:'c'];
 *     this.foreach(list)
 *     .next(function(across){
 *         console.log('one_' + across.key);
 *         if (across.key == 2) return this.break();
 *     })
 *     .next(function(across){
 *         console.log('two');
 *     })
 *     .finally(function(){
 *         console.log('finally');
 *     });
 *
 *     // 結果
 *     one_1
 *     two
 *     one_2
 *     finally
 */
Module.prototype.break = function() {
    return EXEC_BREAK;
}

/**
 * ベンチ用チェックポイント
 */
Module.prototype.bench = function (name) {
    if (!IS_DEBUG_MODE) return;
    var now = (new Date).getTime();
    this._root._benches.push({
        time  : now - this._root._benchTimeMemo,
        name  : name,
        depth : this._depth,
    });
    this._root._benchTimeMemo = now;
}

/**
 * ベンチ用スコア取得
 */
Module.prototype.getBench = function () {
    return (IS_DEBUG_MODE) ? this._root._benches : null;
}


//========================================================
// 内部関数
//========================================================

// AD判別用の被らなそうな適当な値
var ADID = 0x6fa78aff;
Module.prototype._id = ADID;

/**
 * 処理実行
 */
Module.prototype._exec = function(args){
    this._root._now = this;
    if (!this._root.foreachLoop) this._root.foreachLoop = 0;
    var result = this._funcs[this._root._state].call(this._caller || this, (this._root._state == STATE_OK) ? this._args : this._root._err);
    if (typeof(result) == 'object' && result._id == ADID) {
        // 現状でここを通るのはforeach関係くらいだが、ループ回数が多くなると
        // "[RangeError: Maximum call stack size exceeded]"になるので
        // 定期的にnextTickで実行を次回へ回すようにする
        if (this._root.foreachLoop++ > 100) {
            this._root.foreachLoop = 0;
            process.nextTick(function(){result._exec()});
            return;
        }
        result._exec();
        return;
    }
    switch (result) {
        case EXEC_NONE:
            this._execed = true;
            break;
        case EXEC_AGAIN:
            this._exec();
            break;
        case EXEC_CONTINUE:
            var next = this;
            while (!next._isLoop) {
                next = next._next;
            }
            next._exec();
            break;
        case EXEC_BREAK:
            var next = this;
            while (!next._isFinally) {
                next = next._next;
            }
            next._exec();
            break;
        case EXEC_NEXT:
        default:
            this._execed = true;
            if (this._next) {
                if (this._next._depth < this._depth) this.exit();
                this._next._exec();
            }
            break;
    }
};

/**
 * toコア
 */
Module.prototype._to = function(name, argNames, checkfunc) {
    if (!name) {
        this.throw((checkfunc ? 'to' : 'through') + '()のnameがありません', true, 5);
        return function(){};
    }

    var next = this._next;
    if (next._numOfTo === undefined) {
        next._numOfTo = 0;
        if (!next._args) next._args = {};
        if (IS_DEBUG_MODE) next._toStartTime = (new Date).getTime();
    }
    next._numOfTo++;

    var func = function(){
        next._args[name] = {};
        var args = Array.prototype.slice.call(arguments);
        if (checkfunc) checkfunc(args);

        if (args.length != argNames.length) {
            next.throw("コールバックの引数の数が合いません" + " ...At " + (checkfunc ? 'to' : 'through') + "('" + name + "')", false);
            return;
        }
        for (var i=0; i<args.length; i++) {
            next._args[name][argNames[i]] = args[i];
        }

        next._numOfTo--;
    };
    return func;
}

