import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, LoadingController, Loading } from 'ionic-angular';

import { AppGlobals } from '../../app/app.global';
import { TranslateService } from '@ngx-translate/core';
import { WalletServiceProvider } from '../../providers/wallet-service/wallet-service';
import { MvsServiceProvider } from '../../providers/mvs-service/mvs-service';
import { CryptoServiceProvider } from '../../providers/crypto-service/crypto-service';
import { AlertProvider } from '../../providers/alert/alert';

@IonicPage()
@Component({
    selector: 'page-passphrase',
    templateUrl: 'passphrase.html',
})
export class PassphrasePage {

    mnemonic: string = this.navParams.get('mnemonic')
    loading: Loading
    newWallet: boolean = this.navParams.get('newWallet') || false

    constructor(public nav: NavController,
        public navParams: NavParams,
        public globals: AppGlobals,
        public translate: TranslateService,
        private crypto: CryptoServiceProvider,
        public platform: Platform,
        public mvs: MvsServiceProvider,
        public loadingCtrl: LoadingController,
        public wallet: WalletServiceProvider,
        private alert: AlertProvider,
    ) { }

    downloadAndReturnLogin(password) {
        this.nav.setRoot("LoginPage")
        this.download(password)
    }

    /* encypts mnemonic with authentication provider encypt function
     * then writes the data to the json file and downloads the file
     */
    download(password) {
        this.crypto.encrypt(this.mnemonic, password)
            .then((res) => this.dataToKeystoreJson(res))
            .then((encrypted) => this.downloadFile('mvs_keystore.json', JSON.stringify(encrypted)))
            .catch((error) => {
                console.log(error)
            });
    }

    encrypt(password) {
        this.alert.showLoading()
        this.wallet.setSeedMobile(password, this.mnemonic)
            .then((seed) => this.wallet.setMobileWallet(seed))
            .then(() => this.wallet.getWallet(password))
            .then((wallet) => this.wallet.generateAddresses(wallet, 0, this.globals.index))
            .then((addresses) => this.mvs.setAddresses(addresses))
            .then(() => this.wallet.getMasterPublicKey(password))
            .then((xpub) => this.wallet.setXpub(xpub))
            .then(() => this.wallet.saveSessionAccount(password))
            .then(() => this.nav.setRoot("LoadingPage", { reset: true }))
            .catch((e) => {
                console.error(e);
                this.alert.stopLoading()
            });
    }

    passwordValid = (password) => (password) ? password.length > 5 : false;

    passwordRepeatValid = (password, password_repeat) => (password_repeat) ? password_repeat.length > 5 && password_repeat == password : false;

    complete = (password, password_repeat) => (password && password_repeat) ? this.passwordValid(password) && password == password_repeat : false;

    downloadFile(filename, text) {
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);

        if (document.createEvent) {
            var event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        }
        else {
            pom.click();
        }
    }

    dataToKeystoreJson(mnemonic) {
        let tmp = { version: this.globals.version, algo: this.globals.algo, index: this.globals.index, mnemonic: mnemonic };
        return tmp;
    }

}
