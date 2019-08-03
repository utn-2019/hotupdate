module.exports = cc.Class({
    // extends: cc.EventTarget,
    extends: cc.Component,
    //on监听事件  off取消监听  emit广播事件

    properties:{

    },

    ctor() {

    },

    onLoad(){
        cc.game.addPersistRootNode(this.node)
    },

    once(name,fn,target){
        this.node.once(name,fn,target)
    },

    on(name,fn,target){
        this.node.on(name,fn,target)
    },

    off(name,fn,target){
        this.node.off(name,fn,target)
    },

    emit(name,args){
        this.node.emit(name.toString(),args)
    },

    get(url,data,fn,timeout,error) {
        var xhr = cc.loader.getXMLHttpRequest()
        xhr.timeout = 5000
        var str = '?'
        for(var k in data){
            if(str != '?')
                str += '&'
            str += k+'='+data[k]
        }
        if(str == '?')
            str = ''

        if(url == null)
            url = Http.url
        if(cc.sys.os != cc.sys.OS_IOS)
            url = url.replace(/https/,'http')
        var req = url + encodeURI(str)
        xhr.open('GET',req,true)
        if(cc.sys.isNative)
            xhr.setRequestHeader('Accept-Encoding','gzip,deflate','text/html;charset=UTF-8');
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && (xhr.status >= 200 && xhr.status < 300)){
                if(fn)
                    fn(xhr.responseText)
            }
        }
        xhr.ontimeout = function() {
            if(timeout)
                timeout()
        }
        xhr.onerror = function() {
            if(error)
                error()
        }
        xhr.send()
    },

    post(url,data,fn) {
        var xhr = new XMLHttpRequest()
        var timeout = false
        var timer = setTimeout(function(){
            timeout = true
            // xhr.abort()     //请求中止
        },5000)
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status < 400)) {
                var response = xhr.responseText
                if(timeout)
                    return
                clearTimeout(timer)
                if(fn)
                    fn(response)
                // console.log(response)
            }
        }
        xhr.open('POST', url, true)
        xhr.send(data)
    },

    http_get(url,callback){
        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status < 400)) {
                if(callback)
                    callback(xhr.response)
            }
        };
        xhr.responseType = 'arraybuffer'
        xhr.timeout = 5000
        xhr.open('GET', url, true)
        xhr.send()
    },

});
