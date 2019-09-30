import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, Platform, AlertController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AlertProvider } from '../../providers/alert/alert';
import { MvsServiceProvider } from '../../providers/mvs-service/mvs-service';

class AddressBalance {
    constructor(
        public address: string,
        public available: number
    ) { }
}
@IonicPage()
@Component({
    selector: 'page-create-avatar',
    templateUrl: 'create-avatar.html',
})
export class CreateAvatarPage {

    symbol: string = ""
    avatar_address: string = ""
    addressbalances: Array<AddressBalance> = []
    bounty_fee: number = 80
    addressSelectOptions: any
    message: string = ""
    available_symbol: boolean = false
    showAdvanced: boolean = false

    constructor(
        public navCtrl: NavController,
        private alert: AlertProvider,
        private translate: TranslateService,
        public platform: Platform,
        private alertCtrl: AlertController,
        private mvs: MvsServiceProvider,
        private zone: NgZone,
    ) {

        Promise.all([this.mvs.getAddresses(), this.mvs.getAddressBalances()])
            .then(([addresses, addressbalances]) => {
                addresses.forEach((address) => {
                    if (addressbalances[address] && addressbalances[address].ETP && addressbalances[address].ETP.available >= 100000000 && addressbalances[address].AVATAR === '') {
                        this.addressbalances.push(new AddressBalance(address, addressbalances[address].ETP.available))
                    }
                })
            })
    }

    ionViewDidLoad() {
        this.translate.get('SUBTITLE.CREATE_AVATAR_ADDRESS').subscribe((message: string) => {
            this.addressSelectOptions = {
                subTitle: message
            };
        })
    }

    cancel() {
        this.navCtrl.pop();
    }

    create() {
        return this.alert.showLoading()
            .then(() => {
                let messages = [];
                if (this.message) {
                    messages.push(this.message)
                }
                return this.mvs.createAvatarTx(
                    this.avatar_address,
                    this.symbol,
                    undefined,
                    (this.showAdvanced) ? this.bounty_fee * 100000000 / 100 : 80000000,
                    messages
                )
            })
            .catch((error) => {
                console.error(error)
                this.alert.stopLoading()
                switch (error.message) {
                    case 'ERR_CONNECTION':
                        this.alert.showError('ERROR_SEND_TEXT', '')
                        break;
                    case 'ERR_BROADCAST':
                        this.translate.get('MESSAGE.ONE_TX_PER_BLOCK').subscribe((message: string) => {
                            this.alert.showError('MESSAGE.BROADCAST_ERROR', message)
                        })
                        break;
                    case "ERR_DECRYPT_WALLET":
                        this.alert.showError('MESSAGE.PASSWORD_WRONG', '')
                        break;
                    case "ERR_INSUFFICIENT_BALANCE":
                        this.alert.showError('MESSAGE.INSUFFICIENT_BALANCE', '')
                        break;
                    default:
                        this.alert.showError('MESSAGE.CREATE_TRANSACTION', error.message)

                }
            })
    }

    send() {
        this.create()
            .then((result) => {
                this.navCtrl.push("confirm-tx-page", { tx: result.encode().toString('hex') })
                this.alert.stopLoading()
            })
    }

    confirm() {
        this.translate.get('CREATE_AVATAR.CONFIRMATION_TITLE').subscribe((txt_title: string) => {
            this.translate.get('CREATE_AVATAR.CONFIRMATION_SUBTITLE').subscribe((txt_subtitle: string) => {
                this.translate.get('CREATE_AVATAR.CREATE_BTN').subscribe((txt_create: string) => {
                    this.translate.get('CANCEL').subscribe((txt_cancel: string) => {
                        const alert = this.alertCtrl.create({
                            title: txt_title,
                            subTitle: txt_subtitle,
                            buttons: [
                                {
                                    text: txt_create,
                                    handler: data => {
                                        // need error handling
                                        this.send()
                                    }
                                },
                                {
                                    text: txt_cancel,
                                    role: 'cancel'
                                }
                            ]
                        });
                        alert.present()
                    });
                });
            });
        });
    }

    validAddress = (avatar_address) => (avatar_address != '')

    validSymbol = (symbol) => (symbol.length > 2) && (symbol.length < 64) && (!/[^A-Za-z0-9@_.-]/g.test(symbol)) && this.available_symbol

    validMessageLength = (message) => this.mvs.verifyMessageSize(message) < 253

    symbolChanged = (symbol) => {
        symbol = symbol.trim()
        this.symbol = symbol
        if (symbol && symbol.length >= 3) {
            this.mvs.getAvatarAvailable(symbol)
                .then(available => {
                    if (this.symbol != symbol) {
                        return
                    } else {
                        this.available_symbol = available
                    }
                })
                .catch((e) => {
                    this.available_symbol = false
                })
        }
    }

    updateRange() {
        this.zone.run(() => { });
    }

}
