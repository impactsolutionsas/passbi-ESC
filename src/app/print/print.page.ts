import { Component } from '@angular/core';
import EscPosEncoder from 'esc-pos-encoder-ionic';
import { BluetoothSerial } from '@awesome-cordova-plugins/bluetooth-serial/ngx';
import { Storage } from "@ionic/storage";
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { PrinterService } from '../services/printer/printer.service';
@Component({
  selector: 'app-print',
  templateUrl: './print.page.html',
  styleUrls: ['./print.page.scss'],
})
export class PrintPage  {
  devicesList: any[] = [];
  MAC_ADDRESS = '123440'; // check your mac address in listDevices or discoverUnpaired
  today: any;
  heure: any;
  printerlist: any;
  showButton = false

  constructor(
    private bluetoothSerial: BluetoothSerial,
    private route: Router,
    public toastController: ToastController,
    private printerService: PrinterService,
    private storage: Storage,
    ) {
     this.storage.create();
  }
  async addPrinter(){
    await this.printerService.addPrinter(this.MAC_ADDRESS);
  }
  async ionViewDidEnter() {
    this.bluetoothSerial
      .enable()
      .then(() => {
        this.bluetoothSerial
          .list()
          .then((devices) => {
            this.printerlist = devices
          })
          .catch((error) => {
            console.log(error);
            this.showToast(
              'There was an error connecting the printer, please try again!',
            );
          });
      })
      .catch((error) => {
        console.log(error);
        this.showToast('Error activating bluetooth, please try again!');
      });
  }
 async print(){
  this.addPrinter()
  const encoder = new EscPosEncoder();
  const result = encoder.initialize();

    result
      .codepage('cp936')
      .align('center')
      .text('--------- PASSBI ----------')
      .newline()
      .text('--- TICKET TESTE ----')
      .newline()
      .newline()
      .newline()
      .newline()
      .cut();
      const resultByte = result.encode();
      // send byte code into the printer
      this.bluetoothSerial.connect(this.MAC_ADDRESS).subscribe(() => {
        this.bluetoothSerial.write(resultByte)
          .then(async () => {
            const toast = await this.toastController.create({
              message: 'Connexion imprimante validé.',
              duration: 2000,
              position: 'top',
              icon: "checkmark-done",
              color: 'primary'
            });
            toast.present();

          this.bluetoothSerial.clear();
          this.bluetoothSerial.disconnect();
          this.route.navigate(['tabs']);
          console.log('Print success');
        })
        .catch(async (err) => {
          console.error(err);
          const toast = await this.toastController.create({
            message: 'Une erreur de connexion imprimante. Veillez reprendre.',
            duration: 2000,
            position: 'top',
            icon: "warning",
            color: 'danger'
          });
          toast.present();
        });
    });

}


async printerInput(event: any) {
  let value = event.target.value;
  if (value === undefined) {
    const toast = await this.toastController.create({
      message: 'Activez votre imprimante.',
      duration: 2000,
      position: 'middle',
      icon: 'warning',
      color: 'danger',
    });
    toast.present();
  } else {
    this.showButton = true;
  }
}
  close(){
    this.route.navigate(['tabs']);
  }

  async showToast(data: any) {
    let toast = this.toastController.create({
      duration: 2000,
      message: data,
      position: 'bottom',
    });
    (await toast).present();
  }
}
