import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private firestore: Firestore) {}

  getUsers(): Observable<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'id' }) as Observable<any[]>;
  }

  // Méthodes CRUD supplémentaires
  async createUser(user: { 
    name: string; 
    email: string; 
    role: string; 
    country: string;
    dateC: Date;
  }): Promise<any> {
    const usersCollection = collection(this.firestore, 'users');
    
    // Vérifier si l'email existe déjà
    const q = query(usersCollection, where('email', '==', user.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Un utilisateur avec cet email existe déjà.');
    }
    
    return await addDoc(usersCollection, user);
  }

  async updateUser(id: string, user: Partial<{ 
    name: string; 
    email: string; 
    role: string; 
    country: string;
  }>): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    
    // Vérifier si un autre utilisateur a le même email
    if (user.email) {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(
        usersCollection, 
        where('email', '==', user.email),
        where('__name__', '!=', id)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('Un autre utilisateur avec cet email existe déjà.');
      }
    }
    
    return await updateDoc(userDoc, user);
  }

  async deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return await deleteDoc(userDoc);
  }
}