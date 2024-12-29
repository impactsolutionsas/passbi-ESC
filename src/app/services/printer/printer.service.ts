import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrinterService {

  private dbPromise: Promise<IDBDatabase>;
  constructor() {
    this.dbPromise = this.initIndexedDB();
  }
  private initIndexedDB(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('printerDB', 1);
      request.onerror = (event) => {
        console.error('IndexedDB Error:', event);
        reject(event);
      };
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        db.createObjectStore('printer', { keyPath: 'id' });
      };
      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };
    });
  }

  getPrinter(): Promise<any | undefined> {
    return this.dbPromise.then(db => {
      const tx = db.transaction('printer', 'readonly');
      const store = tx.objectStore('printer');
      return new Promise<any | undefined>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
          console.error(`IndexedDB Error fetching printer:`, event);
          reject(event);
        };
      });
    });
  }


  async addPrinter(printer: any): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('printer', 'readwrite');
    const store = tx.objectStore('printer');

    // Supprimer l'ancien enregistrement avant d'ajouter le nouveau
    const requestDelete = store.clear(); // Supprime tous les enregistrements dans le store

    return new Promise<void>((resolve, reject) => {
      requestDelete.onsuccess = async () => {
        // Après avoir supprimé, ajoute la nouvelle imprimante
        if (typeof printer === 'string') {
          printer = { id: Date.now(), name: printer }; // Par exemple, tu peux utiliser le nom de l'imprimante comme chaîne
        }
        if (!printer.id) {
          printer.id = Date.now(); // Si pas d'ID, générer un ID unique
        }

        const requestAdd = store.put(printer);

        requestAdd.onsuccess = () => {
          console.log('Printer added successfully');
          resolve();
        };
        requestAdd.onerror = (event) => {
          console.error('Error adding printer to IndexedDB:', event);
          reject(event);
        };
      };

      requestDelete.onerror = (event) => {
        console.error('Error clearing printer store:', event);
        reject(event);
      };
    });
  }


}
