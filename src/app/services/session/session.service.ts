import { Injectable } from '@angular/core';
import { Session } from '../models/session.model';
import { Network } from '@capacitor/network';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Storage } from '@ionic/storage';
import { RemoteService } from '../firebase/firestore.service';
import { DatabaseService } from '../local/database.service';

const SESSION_DB = 'Selling';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private networkStatus$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  private _isSyncing: boolean = false;
  private currentSessionSubject: BehaviorSubject<Session | null> =
    new BehaviorSubject<Session | null>(null);
  currentSession$ = this.currentSessionSubject.asObservable();
  private _Session: BehaviorSubject<Session[]> = new BehaviorSubject<Session[]>(
    []
  );

  constructor(
    private storage: Storage,
    private remoteDB: RemoteService,
    private localDB: DatabaseService
  ) {
    this.storage.create();
    this.watchNetworkStatus();
    this.syncOnNetworkStatus();
    this.loadCurrentSession();
  }

  private watchNetworkStatus() {
    Network.getStatus().then((status) => {
      this.networkStatus$.next(status.connected);
    });

    Network.addListener('networkStatusChange', (status) => {
      this.networkStatus$.next(status.connected);
    });
  }
  get Sessions(): Observable<Session[]> {
    return this._Session.asObservable();
  }
  private syncOnNetworkStatus() {
    this.networkStatus$
      .pipe(
        switchMap((isOnline) => {
          if (isOnline && !this._isSyncing) {
            return from(this.localDB.getSessionsLocally()).pipe(
              switchMap((sessions) => {
                const unsyncedSessions = sessions.filter(
                  (session) => !session.isOnline
                );
                for (let index = 0; index < sessions.length; index++) {
                  const element = sessions[index];
                  this.remoteDB.onlineUpdateSession(element);
                }
                if (unsyncedSessions.length > 0) {
                  this._isSyncing = true;
                  return from(this.syncSessionsToSupabase(unsyncedSessions));
                } else {
                  return of(null);
                }
              })
            );
          } else {
            return of(null);
          }
        }),
        catchError((error) => {
          console.error('Erreur lors de la synchronisation :', error);
          return of(null);
        })
      )
      .subscribe();
  }
  async loadCurrentSession() {
    const sessions = await this.localDB.getSessionsLocally();
    const activeSession = sessions.find((session) => session.isActiveted);
    this.currentSessionSubject.next(activeSession || null);
  }

  async syncSessionsToSupabase(sessions: Session[]) {
    for (const session of sessions) {
      try {
        await this.remoteDB.onlineUpdateSession(session);
        session.isOnline = true;
        await this.localDB.updateLocalSession(session);
      } catch (error) {
        console.error('Erreur de synchronisation de session :', error);
      }
    }
    this._isSyncing = false;
  }

  async addSession(session: Session): Promise<void> {
    const existingSession = await this.localDB.verifSession(session.deviceId);
    if (existingSession === null) {
      session.isOnline = false;
      await this.localDB.storeSessionLocally(session).finally(async () => {
        this.currentSessionSubject.next(session);
      });

      if (this.networkStatus$.getValue()) {
        try {
          session.isOnline = true;
          await this.remoteDB.onlineAddSession(session);
        } catch (error) {
          session.isOnline = false;
        }
      }
    } else {
      console.error(
        'Une session existe déjà pour ce device et cette date',
        existingSession
      );
      throw new Error('Une session existe déjà pour ce device et cette date');
    }
  }

  async updateSession(session: Session): Promise<void> {
    await this.localDB.updateLocalSession(session);
    this.currentSessionSubject.next(session);
    if (this.networkStatus$.getValue()) {
      try {
        await this.remoteDB.onlineUpdateSession(session);
        session.isOnline = true;
      } catch (error) {
        session.isOnline = false;
      }
    }
  }
  async localUpdateSession(session: Session): Promise<void> {
    await this.localDB.updateLocalSession(session);
    this.currentSessionSubject.next(session);
  }
}
