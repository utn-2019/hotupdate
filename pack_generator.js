var fs = require('fs');
var path = require('path');
var crypto = require('crypto');


var manifest = {
    packageUrl: 'http://localhost:80/test/remote-assets/',
    remoteManifestUrl: 'http://localhost:80/test/remote-assets/project.manifest',
    remoteVersionUrl: 'http://localhost:80/test/remote-assets/version.manifest',
    version: '1.0.0',
    assets: {},
    searchPaths: [],
    module: ''
};

var param = null  //子包配置，name version
var dest = './remote-assets/';
var src = './jsb/';
var url = ''

// Parse arguments
var i = 2;
while ( i < process.argv.length) {
    var arg = process.argv[i];

    switch (arg) {
    case '--url' :
    case '-u' :
        url = process.argv[i+1];
        manifest.packageUrl = url;
        manifest.remoteManifestUrl = url + 'project.manifest';
        manifest.remoteVersionUrl = url + 'version.manifest';
        i += 2;
        break;
    case '--version' :
    case '-v' :
        manifest.version = process.argv[i+1];
        i += 2;
        break;
    case '--src' :
    case '-s' :
        src = process.argv[i+1];
        i += 2;
        break;
    case '--dest' :
    case '-d' :
        dest = process.argv[i+1];
        i += 2;
        break;
    case '-p' :
        param = JSON.parse(process.argv[i+1])
        i += 2;
        break;
    default :
        i++;
        break;
    }
}


function readDir (dir, obj) {
    var stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
        return;
    }
    var subpaths = fs.readdirSync(dir), subpath, size, md5, compressed, relative;
    for (var i = 0; i < subpaths.length; ++i) {
        if (subpaths[i][0] === '.') {
            continue;
        }
        subpath = path.join(dir, subpaths[i]);
        stat = fs.statSync(subpath);
        if (stat.isDirectory()) {
            readDir(subpath, obj);
        }
        else if (stat.isFile()) {
            // Size in Bytes
            size = stat['size'];
            md5 = crypto.createHash('md5').update(fs.readFileSync(subpath, 'binary')).digest('hex');
            compressed = path.extname(subpath).toLowerCase() === '.zip';
            relative = path.relative(src, subpath);
            relative = relative.replace(/\\/g, '/');
            relative = encodeURI(relative);
            obj[relative] = {
                'size' : size,
                'md5' : md5
            };
            if (compressed) {
                obj[relative].compressed = true;
            }
        }
    }
}

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
}

var getVersion = function(d){
    return {
        packageUrl: d.packageUrl,
        remoteManifestUrl: d.remoteManifestUrl,
        remoteVersionUrl: d.remoteVersionUrl,
        version: d.version,
        module: d.module
    }
}

var getProject = function(d){
    return {
        packageUrl: d.packageUrl,
        remoteManifestUrl: d.remoteManifestUrl,
        remoteVersionUrl: d.remoteVersionUrl,
        version: d.version,
        assets: {},
        searchPaths: [],
        module: d.module
    }
}

// Iterate res and src folder
readDir(path.join(src, 'src'), manifest.assets);
readDir(path.join(src, 'res'), manifest.assets);

var destManifest = path.join(src, 'project.manifest');
var destVersion = path.join(src, 'version.manifest');

mkdirSync(dest);

fs.writeFile(destManifest, JSON.stringify(manifest), (err) => {
    if (err) throw err;
    console.log('Manifest successfully generated');
});

// delete manifest.assets;
// delete manifest.searchPaths;
fs.writeFile(destVersion, JSON.stringify(getVersion(manifest)), (err) => {
    if (err) throw err;
    console.log('Version successfully generated');
});

if(param){
    function mkdirsSync(dirname) {
        if (fs.existsSync(dirname)) {
            return true;
        } else {
            if (mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname);
                return true;
            }
        }
    }
    var copyFile = function(file){
        let full = path.join(src, file)
        let dir = file.substring(0, file.lastIndexOf('/'))
        // console.log(dir)
        mkdirsSync('./remote-assets-sub/'+dir)
        fs.writeFileSync(path.join('./remote-assets-sub', file), fs.readFileSync(full))
        console.log('copy file:'+full)
        // fs.mkdirSync('./remote-assets/'+dir,{ recursive: true })
        // fs.copyFileSync(full,'./remote-assets/'+file)
    }

    let temp_miss = []
    let pack = fs.readFileSync(src+'asset_module.json','utf-8')
    pack = JSON.parse(pack)
    //  console.log(pack)
    for(let i=0;i<param.length;i++){
        let mod = param[i].name
        let version = param[i].version
        let include = param[i].include

        let project = getProject(manifest)
        project.version = version
        project.packageUrl = url
        project.remoteManifestUrl = url + mod + '_project.manifest'
        project.remoteVersionUrl = url + mod + '_version.manifest'
        project.module = mod

        //根据asset_module记录，分别找出不同模块的资源
        console.log('-----------------------------------start list package resources:::'+mod)
        let assets = manifest.assets
        // console.log('assets:' + JSON.stringify(assets))
        for(k in assets){
            let key = k.substring(k.lastIndexOf('/')+1,k.indexOf('.')) //uuid
            let value = assets[k]
            //  console.log(k + ':' + key)

            if(!pack[key]){
                let sname = k.substring(k.lastIndexOf('.'))
                if(sname == '.jsc' || sname == '.js' || sname == '.json'){
                    project.assets[k] = value
                    if(include)
                        copyFile(k)
                    continue
                }
                key = k.substring(0,k.lastIndexOf('/'))  //res/raw-assets/xx/uuid/raw-sket.json
                key = key.substring(key.lastIndexOf('/')+1)
                if(!pack[key]){
                    console.log('==================================cant find mod:' + k + '  key:'+key)
                    temp_miss.push(k+' key:'+key)
                    continue
                }
            }
            if(pack[key].includes('comm') || pack[key].includes(mod)){
            // if(pack[key].includes('hall') || pack[key].includes('comm') || pack[key].includes(mod)){
                project.assets[k] = value
                if(include)
                    copyFile(k)
            }
        }

        destManifest = path.join(src, mod+'_project.manifest')
        destVersion = path.join(src, mod+'_version.manifest')

        fs.writeFileSync(destManifest, JSON.stringify(project))
        console.log('project.manifest successfully generated:::' + mod);

        fs.writeFileSync(destVersion, JSON.stringify(getVersion(project)))
        console.log('version.manifest successfully generated:::' + mod);

        // if(mod == 'hall'){
        //     destManifest = path.join(dest, mod+'_project.manifest')
        //     fs.writeFileSync(destManifest, JSON.stringify(project))
        // }

        if(include){
            mkdirsSync('./remote-assets-sub')
            fs.writeFileSync('./remote-assets-sub/'+mod+'_project.manifest', JSON.stringify(project))
            fs.writeFileSync('./remote-assets-sub/'+mod+'_version.manifest', JSON.stringify(getVersion(project)))
        }
    }

    if(temp_miss.length > 0)
        console.log('================================================\n miss mod file\n',JSON.stringify(temp_miss))
}
