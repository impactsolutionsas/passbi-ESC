import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { v4 as uuidv4 } from 'uuid';
import { Session, Trip } from '../services/models/session.model';
import { SessionService } from '../services/session/session.service';
import { AuthService } from '../services/auth/auth.service';
import { DayliePaid } from '../services/models/dayliPay.model';
import { PrinterService } from '../services/printer/printer.service';
@Component({
  selector: 'app-session',
  templateUrl: './session.page.html',
  styleUrls: ['./session.page.scss'],
})
export class SessionPage implements OnInit {
  sessionForm!: FormGroup;
  leavingPoint: any;
  destinationPoint: any;
  destination: any;
  device: any;
  itinerarys: any;
  itinerary: any;
  points: any;
  showButton: boolean = false;
  showPoints: boolean = false;
  printer: any
  constructor(
    private fb: FormBuilder,
    private platform: Platform,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    public toastController: ToastController,
    private sessionService: SessionService,
    private storage: Storage,
    private printerService: PrinterService,
    private loadingController: LoadingController
  ) {
    this.storage.create();
  }

  ngOnInit() {
    console.log('Session')
    this.sessionForm = this.fb.group({
      seller: ['', [Validators.required]],
      driver: ['', [Validators.required]],
      itineraryId: ['', [Validators.required]],
      rising: ['', [Validators.required]],
    });
  }
  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.storage.get('loggInUser').then(async (res) => {
        if (res === null) {
          this.router.navigate(['/login']);
        }else{
          console.log('🚀 ~ SessionPage ~ this.device:', res);
          this.device = res
          this.itinerarys = this.device.Reseau.Itinerary
          console.log("🚀 ~ SessionPage ~ this.storage.get ~ this.itinerarys:", this.itinerarys)
          this.printer = await this.printerService.getPrinter()
          if (this.printer.length > 0) {
            this.printer = this.printer[0].name.toString();
          }
        }
      });
    });
  }

  async pointsInput(event: any) {
    let value = event.target.value;
    console.log("🚀 ~ SessionPage ~ pointsInput ~ value:", value)
    if (value === undefined) {
      const toast = await this.toastController.create({
        message: 'Ce champ  ne peut pas être vide.',
        duration: 2000,
        position: 'top',
        icon: 'warning',
        color: 'danger',
      });
      toast.present();
    } else {
      this.itinerary = this.itinerarys.filter(
        (group: { id: number }) => group.id === value
      );
      this.points = this.itinerary[0]?.Coordinate;
      this.leavingPoint = this.points[0]?.name;
      this.destinationPoint = this.points[1]?.name;
      this.showPoints = true;
    }
  }
  async buttonInput(event: any) {
    let value = event.target.value;
    if (value === undefined) {
      const toast = await this.toastController.create({
        message: 'Ce champ  ne peut pas être vide.',
        duration: 2000,
        position: 'top',
        icon: 'warning',
        color: 'danger',
      });
      toast.present();
    } else {
      this.showButton = true;
    }
  }
  async onSubmit() {
    if (this.sessionForm.valid) {
      const { seller, driver, itineraryId, rising } = this.sessionForm.value;
      if (rising == this.leavingPoint) {
        this.destination = this.destinationPoint;
      } else {
        this.destination = this.leavingPoint;
      }
      let selecteditineraryId = itineraryId;

      let itinerarySelected = this.itinerarys.filter(
        (group: { id: number }) => group.id === selecteditineraryId
      );
      this.storage.set('itinerary', itinerarySelected);
      const newDayliePaid: DayliePaid = {
        amount: this.device.Companie.daylie_amount,
        code: this.generateRandomCode(),
        isPaid: false,
        paidTime: '',
        paidBy: '',
        paidName: '',
        paidMethode: '',
      }

      const newTrajet : Trip = {
        tripId: uuidv4(),
        number: 1,
        distance: 0,
        itineraryId: itinerarySelected[0].id,
        duration: '40',
        departureTime: new Date().toLocaleTimeString('fr-FR'),
        arrivalTime: 'En cours',
        rising: rising,
        destination: this.destination,
        revenue: 0,
        ticketsCount: 0,
        isActivated: true,
        tickets: []
      };
      const newSelling: Session = {
        offlineId: uuidv4(),
        type: 'Vente',
        itineraryId: itineraryId,
        seller: seller,
        revenue: 0,
        expense: 0,
        solde: 0,
        ticketCount: 0,
        trajetCount: 1,
        controlsCount: 0,
        driver: driver,
        deviceId: this.device.id,
        startTime: new Date().toLocaleTimeString('fr-FR'),
        endTime: 'En cours',
        sellingDate: new Date().toLocaleDateString('fr-FR'),
        vehiculeId: this.device.vehiculeId,
        companieId: this.device.CompanieId,
        operatorId: this.device.operatorId,
        reseauId: this.device.reseauId,
        isActiveted: true,
        isOnline: false,
        itinerary: itinerarySelected[0],
        dayliePaid: newDayliePaid,
        trips: [newTrajet],
        vehicule: this.device.Vehicule,
        lastTicket: {
          code: '',
          price: 0,
          name: '',
          time: '',
          zone: '',
        },
        controles: [],
        fees: [],
        rentals: []
      };
      const loading = await this.loadingController.create({
        message: 'Ouverture en cours...',
      });
      await loading.present();
      try {
        await this.sessionService.addSession(newSelling);
        this.sessionForm.reset();
        await loading.dismiss();
        if (this.printer.length > 0) {
          this.router.navigate(['/tabs']);
        }else{
          this.router.navigate(['/print']);
        }
      } catch (error) {
        console.log("🚀 ~ SessionPage ~ onSubmit ~ error:", error)
        await loading.dismiss();
        await this.showAlert('Erreur de connexion', 'Veuillez reprendre');
      }
    }
  }

  private async showAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }
  generateRandomCode(): string {
    const min = 100000; // Valeur minimale (100000 pour 6 chiffres)
    const max = 999999; // Valeur maximale (999999 pour 6 chiffres)
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    return random.toString();
  }
  logout() {
    this.authService.logout();
  }
}
