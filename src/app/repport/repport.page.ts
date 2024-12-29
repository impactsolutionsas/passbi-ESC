import { Component, OnInit } from '@angular/core';
import { Rate, Session, Trip } from '../services/models/session.model';
import { SessionService } from '../services/session/session.service';
import { Platform, ActionSheetController, ToastController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { DatabaseService } from '../services/local/database.service';

@Component({
  selector: 'app-repport',
  templateUrl: './repport.page.html',
  styleUrls: ['./repport.page.scss'],
})
export class RepportPage implements OnInit {

  currentSession: Session | null = null;
  tripsList: Trip[] = [];
  device: any;
  public segment: string = "ventes";
  constructor(
    private sessionService: SessionService,
    private platform: Platform,
    private router: Router,
    private storage: Storage,
    private authService: AuthService,
    private localDB: DatabaseService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private actionSheetCtrl: ActionSheetController) {
      this.storage.create();
    }

    async ionViewWillEnter() {
      await this.platform.ready();
      try {
        await this.storage.get('loggInUser').then(async (res) => {
          console.log('🚀 ~ HomePage ~ this.storage.get ~ res:', res);
          this.device = res
          console.log("🚀 ~ HomePage ~ awaitthis.storage.get ~ this.device:", this.device)
          if (!res) {
            // Rediriger vers la page de connexion si aucun utilisateur n'est connecté
            this.router.navigate(['/login']);
            return;
          }
          const session = await this.localDB.verifSession(res.id);
          if (!session) {
            console.warn('Session indéfinie. Déconnexion en cours...');
            this.authService.logout();
            return; // Arrêter l'exécution si l'utilisateur est déconnecté
          }
          this.currentSession = session;
          console.log(
            '🚀 ~ HomePage ~ this.storage.get ~ this.currentSession :',
            this.currentSession
          );
          if (this.currentSession) {
            const trips = this.currentSession.trips;
            if (trips && trips.length > 0) {
              this.tripsList = trips.sort((a, b) => a.number - b.number).reverse();
            } else {
              this.tripsList = [];
            }
            console.log("🚀 ~ RepportPage ~ awaitthis.storage.get ~ this.tripsList:", this.tripsList)
          }
        })
      } catch (error) {
        console.error(
          'Erreur lors de la récupération des informations utilisateur :',
          error
        );
      }
    }

    ngOnInit() {
      this.sessionService.currentSession$.subscribe((session) => {
        this.currentSession = session;
      });
    }
    segmentChanged(ev: any) {
      this.segment = ev.detail.value;
    }
   // Fonction pour compter les tickets par rate pour un trajet donné
  getTicketCountByRate(trip: Trip, rate: Rate): number {
    return trip.tickets?.filter(ticket => ticket.price === rate.price).length || 0;
  }

  // Fonction pour calculer la somme des tickets par rate pour un trajet donné
  sumTicketsByRate(trip: Trip, rate: Rate): number {
    return trip.tickets?.filter(ticket => ticket.price === rate.price).reduce((sum, ticket) => sum + ticket.price, 0) || 0;
  }

  // Fonction pour calculer le total des tickets d'un trip
  sumTickets(tickets: any[]): number {
    return tickets.reduce((somme, ticket) => somme + ticket.price, 0);
  }
  sumRentals(): number {
    return this.currentSession?.rentals?.reduce((sum, rental) => sum + rental.price, 0) || 0;
  }
  sumControls(): number {
    return this.currentSession?.controles?.length || 0;
  }
  sumLocations(): number {
    return this.currentSession?.rentals?.length || 0;
  }
  async menuList() {
    const actionSheet = await this.actionSheetCtrl.create({
      cssClass: 'custom-action-sheet', // Ajouter une classe CSS pour le style
      mode: 'ios', // Utiliser le mode iOS pour un aspect plus moderne
      buttons: [
        {
          text: 'CONTRÔLES', // Texte plus court
          handler: () => {
            this.router.navigate(['/tabs/controle']);
          },
        },
        {
          text: 'LOCATIONS', // Texte plus court
          handler: () => {
            this.router.navigate(['/tabs/rental']);
          },
        },
        {
          text: 'IMPRIMANTE', // Texte plus court
          handler: () => {
            this.router.navigate(['/print']);
          },
        },
        {
          text: 'DÉPENSES', // Texte plus court
          handler: () => {
            this.router.navigate(['/tabs/fees']);
          },
        },
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'cancel-button', // Ajouter une classe CSS pour le bouton Annuler
        },
      ],
    });

    await actionSheet.present();
  }

  async sync(){
    if (!this.currentSession) {
      console.error(
        "Session courante manquante, impossible d'ajouter un nouveau trip."
      );
      return;
    }else{
      const loading = await this.loadingController.create({
        message: 'Synchronisation encours ...',
      });
      await loading.present();
      const toast = await this.toastController.create({
        message: 'Erreur de synchronisation',
        duration: 1500,
        position: 'bottom',
      });
      this.sessionService.updateSession(this.currentSession)
      .catch(async er => toast.present())
      .then(() => loading.dismiss());
    }

  }
}

