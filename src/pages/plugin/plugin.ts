import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { MvsServiceProvider } from '../../providers/mvs-service/mvs-service'
import { AlertProvider } from '../../providers/alert/alert';
import { Plugin, PluginProvider } from '../../providers/plugin/plugin'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@IonicPage({
    segment: 'plugin/:name'
})
@Component({
    selector: 'page-plugin',
    templateUrl: 'plugin.html',
})
export class PluginPage {


    @ViewChild('iframe') iframe: ElementRef;
    plugin: Plugin = new Plugin()
    urlSafe: SafeResourceUrl;

    constructor(
        public navCtrl: NavController,
        private mvs: MvsServiceProvider,
        private alert: AlertProvider,
        public sanitizer: DomSanitizer,
        private plugins: PluginProvider,
        public navParams: NavParams
    ) {
    }

    ionViewWillLeave() {
        window.removeEventListener('message', this.processMessage);
    }

    getPermissions() {
        return Promise.resolve(this.plugin.config.permissions)
    }

    evaluateResponse(data) {
        switch (data.query) {
            case 'permissions':
                return this.getPermissions()
            case 'create-mit':
                return this.createMIT(data.params)
            case 'avatars':
                return this.mvs.listAvatars()
            case 'addresses':
                return this.mvs.getAddresses()
            case 'broadcast':
                return this.mvs.broadcast(data.params.tx)
            default:
                throw Error('Illegal request')
        }
    }

    processMessage = (event) => {
        event.stopPropagation()
        let source: any = event.source;
        if (this.plugin.config.permissions.indexOf(event.data.query) < 0) {
            source.postMessage({
                topic: 'error',
                nonce: event.data.nonce,
                value: "ERR_PERMISSION_DENIED"
            }, event.origin)
        } else {
            this.evaluateResponse(event.data)
                .then(tx => {
                    source.postMessage({
                        topic: 'avatars',
                        nonce: event.data.nonce,
                        value: tx
                    }, event.origin)
                })
                .catch(error => {
                    console.log(error)
                    source.postMessage({
                        topic: 'error',
                        nonce: event.data.nonce,
                        value: error.message
                    }, event.origin)
                })
        }
    }

    ionViewDidLoad() {
        this.plugins.getPlugins()
            .then(plugins => {
                plugins.forEach(plugin => {
                    if (plugin.name == this.navParams.get('name'))
                        this.plugin = plugin;
                })
                if (this.plugin == undefined) {
                    this.navCtrl.setRoot('AccountPage')
                } else {
                    if (this.plugin) {
                        this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.plugin.url);
                        window.addEventListener("message", this.processMessage, false);
                    }
                }
            })
        console.log('ionViewDidLoad PluginPage');
    }

    createMIT(params) {
        let address = null;
        if (params.avatar == undefined)
            throw 'ERR_AVATAR_UNDEFINED'
        if (params.symbol == undefined)
            throw 'ERR_MIT_SYMBOL_UNDEFINED'
        if (params.content == undefined)
            throw 'ERR_CONTENT_UNDEFINED'
        return this.mvs.listAvatars()
            .then(avatars => {
                avatars.forEach(avatar => {
                    if (avatar.symbol == params.avatar)
                        address = avatar.address
                })
                if (address == null) throw 'ERR_AVATAR_ADDRESS_NOT_FOUND'
                return address;
            })
            .then(address => {
                return this.askPassphrase(params)
                    .then((passphrase: string) => {
                        console.log(passphrase)
                        return this.mvs.createRegisterMITTx(passphrase, address, params.avatar, params.symbol, params.content, undefined).then(tx=>(params.raw)?tx.encode().toString('hex'):tx)
                    })
            })
    }

    askPassphrase(params) {
        return new Promise((resolve, reject) => {
            this.alert.askPassphrase(`Plugin wants to create new MIT ${params.symbol}. It will be issued for by your Avatar ${params.avatar}`, (passphrase) => {
                if (passphrase) resolve(passphrase)
                else reject(Error('ERR_USER_CONFIRMATION_FAILED'))
            })

        })
    }
}
