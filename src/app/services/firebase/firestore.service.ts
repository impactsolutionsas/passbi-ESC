import { Injectable } from '@angular/core';
import { Database, ref, get, set, update, query, orderByChild, equalTo, onValue } from '@angular/fire/database';
import { Session } from '../models/session.model';

@Injectable({
  providedIn: 'root',
})
export class RemoteService {
  constructor(private database: Database) {}

  /**
   * Récupère une session en fonction de `deviceId` et de la date du jour.
   */
  async remoteSessions(deviceId: number): Promise<Session | null> {
    const today = new Date().toLocaleDateString('fr-FR');
    try {
      const sessionsRef = ref(this.database, 'sessions');
      const sessionsQuery = query(sessionsRef, orderByChild('deviceId'), equalTo(deviceId));

      // Récupérer les données
      const snapshot = await get(sessionsQuery);
      if (snapshot.exists()) {
        const sessions = snapshot.val();
        console.log("🚀 ~ RemoteService ~ remoteSessions ~ sessions:", sessions)

        // Filtrer les sessions pour la date actuelle
        const filteredSessions = Object.values(sessions).filter(
          (session: any) => session.sellingDate === today
        );
        console.log("🚀 ~ RemoteService ~ remoteSessions ~ filteredSessions:", filteredSessions)

        return filteredSessions.length > 0 ? (filteredSessions[0] as Session) : null;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions :', error);
      return null;
    }
  }


/**
   * Ajoute ou met à jour une session en ligne.
   */
  async onlineAddSession(newSession: Session): Promise<Session> {
    try {
      const sessionRef = ref(this.database, `sessions/${newSession.offlineId}`);

      // Récupérer les données existantes
      const snapshot = await get(sessionRef);

      if (snapshot.exists()) {
        const existingSession = snapshot.val() as Session;
        console.log('Session existante trouvée :', existingSession);
        return existingSession;
      } else {
        // Créer une nouvelle session
        await set(sessionRef, newSession);
        console.log('Nouvelle session créée :', newSession);
        return newSession;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout ou de la mise à jour de la session :', error);
      throw error;
    }
  }

  /**
   * Met à jour une session existante ou la crée si elle n'existe pas.
   */
  async onlineUpdateSession(session: Session): Promise<Session> {
    try {
      const sessionRef = ref(this.database, `sessions/${session.offlineId}`);

      // Récupérer les données existantes
      const snapshot = await get(sessionRef);

      if (snapshot.exists()) {
        console.log('La session existe, mise à jour...');
      } else {
        console.log('La session n\'existe pas, création...');
      }

      // Ajouter ou mettre à jour les données
      await update(sessionRef, session);
      console.log('Session mise à jour avec succès :', session);
      return session;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la session :', error);
      throw error;
    }
  }

  /**
   * Ajoute ou met à jour des données dans `selling`.
   */
  async rtUpdateSession(session: Session): Promise<Session> {
    try {
      const sessionRef = ref(this.database, `selling/${session.offlineId}`);

      const data = {
        seller: session.seller,
        driver: session.driver,
        startTime: session.startTime,
        endTime: session.endTime,
        lastTicket: session.lastTicket,
        ticketCount: session.ticketCount,
        trajetCount: session.trajetCount,
        solde: session.solde,
        expense: session.expense,
        revenue: session.revenue,
        controlsCount: session.controlsCount,
        sellingDate: session.sellingDate,
        isActiveted: session.isActiveted,
      };

      // Récupérer les données existantes
      const snapshot = await get(sessionRef);

      if (snapshot.exists()) {
        console.log('Selling existant trouvé, mise à jour...');
      } else {
        console.log('Selling inexistant, création...');
      }

      // Ajouter ou mettre à jour les données
      await update(sessionRef, data);
      console.log('Selling mis à jour avec succès :', session);
      return session;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de selling :', error);
      throw error;
    }
  }
}
