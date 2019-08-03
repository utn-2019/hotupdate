cc.Class({
    extends: cc.Component,

    properties: {

    },

    go(){
        console.log('go-----------------')
    },

    start(){
        //node扩展方法，upgrade中用到
        cc.Node.prototype.find = function(path) {
            return cc.find(path,this)
        }

        window.Network = this.instance('TTNetwork')

        cc.find('bt_update_hall',this.node).on('click',this.onClick,this)
        cc.find('bt_update_mj',this.node).on('click',this.onClick,this)
        cc.find('bt_update_pdk',this.node).on('click',this.onClick,this)

        cc.find('bt_load_mj',this.node).on('click',this.onClickLoad,this)
        cc.find('bt_load_pdk',this.node).on('click',this.onClickLoad,this)
    },

    onClick(event){
        let name = event.node.name
        let mod = 'hall'
        if(name != 'bt_update_hall')
            mod = name.substring(10)

        cc.find('update',this.node).getComponent('TTUpgrade').check_update(this,mod)
    },

    onClickLoad(event){
        let name = event.node.name
        if(name == 'bt_load_mj')
            cc.director.loadScene('mj')
        else if(name == 'bt_load_pdk')
            cc.director.loadScene('pdk')
    },

    instance(name){
        let n = new cc.Node('(singleton)'+name)
        n.parent = cc.director.getScene()
        console.log('create instance class of '+name)
        return n.addComponent(name)
    }
});
