'use strict';
var Path = require("fire-path");
var Fs = require("fire-fs");

//这里配置资源所属模块，配置见项目中 project.txt文件
//仅需记录 .fire 和 resources文件夹中文件，会自动计算依赖
let list = [
    // { module:'hall',    path:'resources/audio/comm', type:'folder',  },
    // { module:'hall',    path:'resources/prefab/hall', type:'folder',  },
    // { module:'mj',      path:'resources/texture/jpg', type:'folder',  },
    // { module:'mj&pdk',  path:'resources/texture/result/result.png', type:'res',  },
    // { module:'hall',    path:'scene/hall.fire', type:'res',  },
    // { module:'mj', 	    path:'scene/mj.fire', type:'res',  },
    // { module:'other',   path:'scene/test.fire', type:'res',  },
]

function onBuildStart(options,callback){
    let txt = Fs.readFileSync(options.project+'/assets/assetlist.txt','utf-8')
    list = eval(txt)
    callback()
}

/* 
1. 若资源 A被大厅引用，又被其他游戏引用，则此资源属于大厅
2. 若资源 B被多个游戏同时引用，记录所有引用的模块，打包模块时包含此资源
*/
function onBuildFinish(options,callback) {
    let buildResults = options.buildResults
    let assets = buildResults.getAssetUuids()
    // Editor.log(JSON.stringify(buildResults))

    //第 1 步   以文件路径为key，记录所属子包名称
    let path_module = {}
    for(let i=0;i<list.length;i++){
    	let d = list[i]
    	let path = 'db://assets/' + d.path
    	path_module[path] = d.module
    }

    //第 2 步   记录所有打包资源的路径及所属文件夹
    let asset_pack = []
    for (let i = 0;i<assets.length;++i) {
        let asset = assets[i]
        let url = Editor.assetdb.uuidToUrl(asset)
        if(url == null){
            // Editor.log(asset+'   '+url)
            asset_pack.push({uuid:asset})  //一般为丢失的资源
            continue
        }
        let dir = url.substring(0, url.indexOf('.'))
        dir = dir.substring(0, dir.lastIndexOf('/'))
        let path = buildResults.getNativeAssetPath(asset)
        if(path){
            path = path.replace(/\\/g, '/')
            path = path.substring(path.indexOf('/res/')+1)
        }
        asset_pack.push({uuid:asset, url:url, dir:dir, path:path ? path : ''})
        // let depends = buildResults.getDependencies(asset)
        //     ret.push(buildResults.getNativeAssetPath(asset))
        //     Editor.log(buildResults.getNativeAssetPath(asset))
        // Editor.log(JSON.stringify(depends))
    }

    //第 3 步   以uuid为key，记录所有资源所属子包
    let asset_module = {}
    let fn = (uuid,mod)=>{
        if(!asset_module[uuid])
            asset_module[uuid] = [mod]
        else if(!asset_module[uuid].includes(mod))
            asset_module[uuid].push(mod)
        let depends = buildResults.getDependencies(uuid) || []
        for(let k=0;k<depends.length;k++){
            fn(depends[k],mod)
        }
    }
    for(let i=0;i<asset_pack.length;i++){
        let asset = asset_pack[i]
        // let depends = buildResults.getDependencies(asset.uuid) || [] //依赖资源
    	let mount = Editor.assetdb.isMountByUuid(asset.uuid)  //是否内置资源
    	let mod = asset_module[asset.uuid]  //资源模块名称
        if(mount)
            fn(asset.uuid,'hall')
        else if(!mod){
            let name
            if(path_module[asset.dir])
                name = path_module[asset.dir]
            else if(path_module[asset.url])
                name = path_module[asset.url]
            if(name){
                let temp = name.split('&')
                for(let i=0;i<temp.length;i++)
                    fn(asset.uuid,temp[i])
            }
        }
    }

    //第 4 步   筛查是否有资源位设置子包，并将相关信息存储
    let asset_temp = []
    for(let i=0;i<asset_pack.length;i++){
    	let asset = asset_pack[i]
        let dep = buildResults.getDependencies(asset.uuid) || []
    	if(asset_module[asset.uuid]){
    		asset.module = asset_module[asset.uuid]
            asset.dep = dep
        }
    	else{  //A依赖B B无依赖，先查找到A，所以可以导致A没有记录
            for(let kk=0;kk<dep.length;kk++){
                let ret = asset_module[dep[kk]]
                if(ret){
                    for(let k2=0;k2<ret.length;k2++)
                        fn(asset.uuid,ret[k2])
                }
            }
            if(asset_module[asset.uuid]){
                asset.module = asset_module[asset.uuid]
                asset.dep = dep
            }
            else
                asset_temp.push(asset)
        }
    }
    if(asset_temp.length > 0)
    	Editor.error('请注意,以下资源未设置游戏名称:' + JSON.stringify(asset_temp))

    let root = Path.normalize(options.dest)
    let path = Path.join(root,'asset_pack.json')
	Fs.writeFile(path, JSON.stringify(asset_pack), (err)=> {
        if (err)
            throw err
    })

    path = Path.join(root,'asset_module.json')
	Fs.writeFile(path, JSON.stringify(asset_module), (err)=> {
        if (err)
            throw err
    })

    Editor.log('onBuildFinish')
	callback()
}

module.exports = {
	load(){
		// execute when package loaded
	    Editor.Builder.on('build-start', onBuildStart);
	    // Editor.Builder.on('before-change-files', onBeforeChangeFiles);
	    Editor.Builder.on('build-finished', onBuildFinish);
	},

	unload(){
	    Editor.Builder.removeListener('build-start', onBuildStart);
	    Editor.Builder.removeListener('build-finished', onBuildFinish);
	},

	// register your ipc messages here
	messages: {
        //设置热更新后的搜索路径，让引擎优先加载热更后的资源
        //_game_res_version游戏版本号，覆盖安装时会检测版本，清理旧版资源
        'editor:build-finished': function (event, target) {
            var root = Path.normalize(target.dest);
            var url = Path.join(root, "main.js");
            Fs.readFile(url, "utf8", function (err, data) {
                if (err)
                    throw err

                var newStr =
                    "if(window.jsb){ \n" +
                    "    window._game_res_version = '2.0' \n\n" +

                    "    var version = localStorage.getItem('game_res_version') \n" +
                    "    if(version && version != window._game_res_version){ \n" +
                    "        var path = jsb.fileUtils.getWritablePath() + version \n" +
                    "        if(jsb.fileUtils.isDirectoryExist(path)) \n" +
                    "            console.log('remove old version file:'+jsb.fileUtils.removeDirectory(path)) \n" +
                    "    } \n\n" +

                    "    localStorage.setItem('game_res_version',window._game_res_version) \n" +
                    "    var path = jsb.fileUtils.getWritablePath() + window._game_res_version + '/' \n" +
                    "    jsb.fileUtils.addSearchPath(path,true) \n" +
                    "} \n\n"

                var newData = newStr + data
                Fs.writeFile(url, newData, function (error) {
                    if (err) {
                        throw err;
                    }
                    Editor.log("SearchPath updated in built main.js for hot update");
                });
            });
        }
	},
}