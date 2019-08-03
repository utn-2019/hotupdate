export default cc.Class({
    // jsb.AssetsManager.State = {
    //     UNINITED: 0,
    //     UNCHECKED: 1,
    //     PREDOWNLOAD_VERSION: 2,
    //     DOWNLOADING_VERSION: 3,
    //     VERSION_LOADED: 4,
    //     PREDOWNLOAD_MANIFEST: 5,
    //     DOWNLOADING_MANIFEST: 6,
    //     MANIFEST_LOADED: 7,
    //     NEED_UPDATE: 8,
    //     READY_TO_UPDATE: 9,
    //     UPDATING: 10,
    //     UNZIPPING: 11,
    //     UP_TO_DATE: 12,
    //     FAIL_TO_UPDATE: 13
    // };

    // jsb.Manifest.DownloadState = {
    //     UNSTARTED: 0,
    //     DOWNLOADING: 1,
    //     SUCCESSED: 2,
    //     UNMARKED: 3
    // };

    // jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST = 0;
    // jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST = 1;
    // jsb.EventAssetsManager.ERROR_PARSE_MANIFEST = 2;
    // jsb.EventAssetsManager.NEW_VERSION_FOUND = 3;
    // jsb.EventAssetsManager.ALREADY_UP_TO_DATE = 4;
    // jsb.EventAssetsManager.UPDATE_PROGRESSION = 5;
    // jsb.EventAssetsManager.ASSET_UPDATED = 6;
    // jsb.EventAssetsManager.ERROR_UPDATING = 7;
    // jsb.EventAssetsManager.UPDATE_FINISHED = 8;
    // jsb.EventAssetsManager.UPDATE_FAILED = 9;
    // jsb.EventAssetsManager.ERROR_DECOMPRESS = 10;

    /*更新流程  
    1. 调用checkUpdate接口，下载远程 version.manifest文件->5  Custom Version Compare->3  || ->4
    2. 下载远程 project.manifest文件->5，5，5   Custom Version Compare->3 
    3. 下载需要更新的资源->5,5,5,5,5,6,5,6,5,6
    4. 更新完成 ->8 || ->9  这两种情况都可以认为更新完成
    */

    properties: {
        _am: null,
        file_version: 'version.manifest',
        file_project: 'project.manifest',
        file_module: '',    //模块名称
        file_manifest: '',  //为空时，会读取路径文件，否则直接解析
        _version: '1.0.0',  //考虑到第二次发包，版本号可能不为1.0
        _times: 0,  //更新失败重试次数（md5校验失败、解压失败、下载失败都会返回更新失败）
    },

    //初始化相关参数
    init(data){
        if(!data)
            return
        if(data.file_version)
            this.file_version = data.file_version
        if(data.file_project)
            this.file_project = data.file_project
        if(data.file_module)
            this.file_module = data.file_module
        if(data.file_manifest)
            this.file_manifest = data.file_manifest
        if(data._version)
            this._version = data._version
    },

    //没有用了，放在main.js里处理搜索路径
    // setSearchPath(){
    //     let searchPaths = cc.sys.localStorage.getItem('HotUpdateSearchPaths')
    //     if(!searchPaths || searchPaths == ''){
    //         searchPaths = jsb.fileUtils.getSearchPaths()
    //         cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths))
    //     }
    //     else{
    //         let pathCur = JSON.parse(searchPaths)
    //         let pathNew = jsb.fileUtils.getSearchPaths()
    //         if(pathNew[0] && pathNew[0] != pathCur[0])
    //             cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(pathNew))
    //     }
    // },

    checkCb(event){
        console.log(event.getEventCode() + '  check cb=-------------------------------')
        let error = false, over = false
        switch (event.getEventCode()){
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                // console.log('ERROR_NO_LOCAL_MANIFEST')
                error = true
                break
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                // console.log('ERROR_DOWNLOAD_MANIFEST')
                error = true
                break
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                // console.log('ALREADY_UP_TO_DATE     =====================')
                // console.log(this._am.getRemoteManifest())
                over = true
                this.emit('ALREADY_UP_TO_DATE')
                break
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                console.log('NEW_VERSION_FOUND')
                this._am.setEventCallback(this.updateCb.bind(this))
                this._am.update()
                break
            default:
                break
        }
        if(error || over)
            this._am.setEventCallback(null)
        if(error)
            this.emit('UPDATE_ERROR')
    },

    updateCb(event){
        // console.log(event.getEventCode() + '              =============  up cb------------')
        let error = false, over = false
        switch (event.getEventCode()){
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                // console.log('ERROR_NO_LOCAL_MANIFEST')
                error = true
                break
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                // console.log('ERROR_DOWNLOAD_MANIFEST')
                error = true
                break
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                // console.log('ALREADY_UP_TO_DATE')
                over = true
                this.emit('ALREADY_UP_TO_DATE')
                break
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                // console.log('ERROR_DECOMPRESS')
                break
            case jsb.EventAssetsManager.ERROR_UPDATING:
                // console.log('ERROR_UPDATING')
                break
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                console.log('upgrade finished =========================')
                over = true
                this.emit('UPDATE_FINISHED')
                break
            case jsb.EventAssetsManager.UPDATE_FAILED:
                console.log('UPDATE_FAILED--------------------------------')
                this._times++
                if(this._times < 2){
                    this._am.downloadFailedAssets()
                    return
                }
                this._times = 0
                over = true
                this.emit('UPDATE_FAILED')
                break
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                // console.log('UPDATE_PROGRESSION')
                this.emit('UPDATE_PROGRESSION',event)
                // event.getPercent() / event.getPercentByFile() / event.getDownloadedFiles() / event.getTotalFiles()
                // event.getDownloadedBytes() / event.getTotalBytes() / event.getMessage()
                break
            default:
                break
        }
        if(error || over)
            this._am.setEventCallback(null)
        if(error)
            this.emit('UPDATE_ERROR')
    },

    //upurl:热更地址   dir:更新路径
    check_update(upurl,dir){
        let path = jsb.fileUtils.getWritablePath() + dir  //资源存储路径

        this._am = new jsb.AssetsManager('',path)
        this._am.setVersionCompareHandle(function (versionA, versionB) {
            console.log("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
            // cc.log(JSON.stringify(this._am.getLocalManifest().getSearchPaths()))
            let vA = versionA.split('.')
            let vB = versionB.split('.')
            for (let i = 0; i < vA.length; ++i) {
                let a = parseInt(vA[i])
                let b = parseInt(vB[i] || 0)
                if (a === b)
                    continue
                else
                    return a - b
            }
            if (vB.length > vA.length)
                return -1
            else
                return 0
        }.bind(this))

        /*
        this._am.setVerifyCallback(function (path, asset) {
            // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
            var compressed = asset.compressed;
            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;
            // The size of asset file, but this value could be absent.
            var size = asset.size;
            if (compressed) {
                //info.string = "Verification passed : " + relativePath;
                return true;
            }
            else {
                //info.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                return true;
            }
        })*/

        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2)
        }

        // if (!cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS)
        //     this._am.retain()

        this._am.setEventCallback(this.checkCb.bind(this))

        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            let url = path + '/' + this.file_project  //本地project.manifest文件路径
            // console.log('---------------------------url of project file:' + url)
            if (cc.loader.md5Pipe)
                url = cc.loader.md5Pipe.transformURL(url)
            if(jsb.fileUtils.isFileExist(url)){
                this._am.loadLocalManifest(url)
            }
            else{
                let fileurl = upurl + '/remote-assets/'
                let fileversion = fileurl + this.file_version
                let fileproject = fileurl + this.file_project
                let str = JSON.stringify({
                    'packageUrl': fileurl,
                    'remoteManifestUrl': fileproject,
                    'remoteVersionUrl' : fileversion,
                    'version': this._version,
                    'assets': {},
                    'searchPaths' : [],
                    'module': this.file_module
                })
                console.log('manifest file doesnt exist: ' + str)
                let manifest = new jsb.Manifest(this.file_manifest != '' ? this.file_manifest : str, path)
                this._am.loadLocalManifest(manifest,path)
            }
        }

        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()){
            this.emit('UPDATE_ERROR')
            return
        }
        this.emit('UPDATE_VERSION',this._am.getLocalManifest().getVersion())
        // console.log('check update =-------------------------------------------')
        this._am.checkUpdate()
    },

    get_manifest(){
        return this._am.getLocalManifest()
    },

    release(){
        this._am && this._am.setEventCallback(null)
    },

    //发送更新进度到外部处理逻辑
    emit(id,msg){
        Network.emit(id,msg)
    },
})