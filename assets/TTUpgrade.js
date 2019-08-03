export default cc.Class({
    extends: cc.Component,

    properties: {
        loadBar: null,
        tipLable: null
    },

    onDestroy(){
        if(this.listen_event){
            Network.off('ALREADY_UP_TO_DATE',this.UPDATE_FINISHED,this)
            Network.off('UPDATE_FINISHED',this.UPDATE_FINISHED,this)
            Network.off('UPDATE_FAILED',this.UPDATE_FAILED,this)
            Network.off('UPDATE_ERROR',this.UPDATE_ERROR,this)
            Network.off('UPDATE_PROGRESSION',this.UPDATE_PROGRESSION,this)
            Network.off('UPDATE_VERSION',this.UPDATE_VERSION,this)
        }
    },

    check_update(delegate,mod){
        this.node.active = true
        this.delegate = delegate
        if(!this.listen_event){
            this.listen_event = true
            Network.on('ALREADY_UP_TO_DATE',this.ALREADY_UP_TO_DATE,this)
            Network.on('UPDATE_FINISHED',this.UPDATE_FINISHED,this)
            Network.on('UPDATE_FAILED',this.UPDATE_FAILED,this)
            Network.on('UPDATE_ERROR',this.UPDATE_ERROR,this)
            Network.on('UPDATE_PROGRESSION',this.UPDATE_PROGRESSION,this)
            Network.on('UPDATE_VERSION',this.UPDATE_VERSION,this)

            // this.block_bar = this.node.find('Normal/block_bar')
            this.txt_process = this.node.find('info').getComponent(cc.Label)
            this.txt_version = this.node.find('txt_version').getComponent(cc.Label)
            this.bar_process = this.node.find('ProgressBar').getComponent(cc.ProgressBar)
            this.txt_process.string = '正在检测更新...'
            this.bar_process.progress = 0
        }

        this.updir = window._game_res_version || '1.0'
        this.file_module = mod || ''
        this.file_version = 'version.manifest'
        this.file_project = 'project.manifest'
        if(this.file_module != ''){
            this.file_version = this.file_module + '_version.manifest'
            this.file_project = this.file_module + '_project.manifest'
        }
        this.file_manifest = ''
        let temp = jsb.fileUtils.getWritablePath() + this.updir + '/' + this.file_project
        if(jsb.fileUtils.isFileExist(temp))
            this.file_manifest = jsb.fileUtils.getStringFromFile(temp)
        else if(mod == '' || mod == 'hall') //大厅或单包，请确认你的包体内包含资源列表配置文件
            this.file_manifest = jsb.fileUtils.getStringFromFile(this.file_project)

        this.check_before()
        this.hotup && this.hotup.release()
        let d = {
            file_version: this.file_version,
            file_project: this.file_project,
            file_module: this.file_module,
            file_manifest: this.file_manifest,
        }
        this.hotup = new (require('TTHotUpdate'))()
        this.hotup.init(d)
        this.hotup.check_update('http://192.168.2.17:8000/update/',this.updir)
    },

    //更新前检测旧版本目录 和 本地缓存目录是否存在未完成的更新
    check_before(){
        let path = jsb.fileUtils.getWritablePath() + this.updir + '_temp'
        let file = path + '/project.manifest.temp'
        if(jsb.fileUtils.isFileExist(file)){
            let str = jsb.fileUtils.getStringFromFile(file)
            if(str == '')
                str = '{}'
            let mod = JSON.parse(str).module
            if(mod != this.file_module)
                console.log('remove temp file:'+jsb.fileUtils.removeFile(file))
        }
    },

    //更新完成后检测本地manifest，进行更名等操作
    check_after(finish){
        let path = jsb.fileUtils.getWritablePath() + this.updir
        let file = path + '/version.manifest'
        let newfile = path + '/' + this.file_version
        if(jsb.fileUtils.isFileExist(file)){
            console.log('version file exist')
            let str = jsb.fileUtils.getStringFromFile(file)
            let mod = JSON.parse(str).module
            if(mod && mod == this.file_module){
                if(file == newfile)
                    console.log('rename same,so dont need to do, version.manifest')
                else
                    console.log('rename version:'+jsb.fileUtils.renameFile(file,newfile))
            }
            else
                console.log('remove version file:'+jsb.fileUtils.removeFile(file))
        }

        file = path + '/project.manifest'
        newfile = path + '/' + this.file_project
        if(jsb.fileUtils.isFileExist(file)){
            console.log('project file exist')
            let str = jsb.fileUtils.getStringFromFile(file)
            let mod = JSON.parse(str).module
            if(mod && mod == this.file_module){
                if(file == newfile)
                    console.log('rename same,so dont need to do')
                else
                    console.log('rename project:'+jsb.fileUtils.renameFile(file,newfile))
            }
            else
                console.log('remove project file:'+jsb.fileUtils.removeFile(file))
        }
    },

    UPDATE_PROGRESSION(event){
        // console.log('upgrade ---:' + (event ? event.getMessage() : ''))
        let p = event ? event.getPercent() : null
        if(p){
            this.txt_process.string = '正在更新资源...' + Math.floor(p*100) + '%'
            this.bar_process.progress = p
        }
    },

    ALREADY_UP_TO_DATE(){
        this.txt_process.string = '更新完成，正在加载资源...'
        this.check_after(true)
        this.delegate.go()
    },

    UPDATE_FINISHED(){
        this.txt_process.string = '更新完成，正在加载资源...'
        this.check_after(true)
        // this.delegate.go()
        cc.game.restart()
    },

    UPDATE_FAILED(){
        this.txt_process.string = '更新完成，正在加载资源...'
        this.check_after()
        // this.delegate.go()
        cc.game.restart()
    },

    UPDATE_ERROR(event){
        console.log('update error ---------------------')
        let path = jsb.fileUtils.getWritablePath() + this.updir  //资源存储路径
        if(jsb.fileUtils.isFileExist(path+'/project.manifest'))
            console.log('project file exist ============')
        if(jsb.fileUtils.isFileExist(path+'/version.manifest'))
            console.log('version file exist ============')
         

        this.txt_process.string = '更新出错了...' + (event ? event.getMessage() : '')
        // cc.alert({ content: '更新出现问题了，请重新试试', ok: '退出', cancel: '重试' },
        //     () => {cc.game.end()},
        //     true,
        //     () => {cc.game.restart()}
        // )
    },

    UPDATE_VERSION(msg){
        this.txt_version.string = msg
    },

});
