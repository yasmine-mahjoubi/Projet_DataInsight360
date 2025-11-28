import { Injectable, inject, signal } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
         signOut, user, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';

export interface UserProfile {
  email: string;
  name: string;
  country: string;
  role: string;
  dateC: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);

  constructor() {
    user(this.auth).subscribe((user) => {
      this.currentUser.set(user);
      if (user) {
        this.loadUserProfile(user.uid);
      } else {
        this.userProfile.set(null);
      }
    });
  }

  // Connexion
  login(email: string, password: string): Observable<void> {
    return from(
      signInWithEmailAndPassword(this.auth, email, password)
        .then(async (credential) => {
          await this.loadUserProfile(credential.user.uid);
        })
    );
  }

  // Inscription
  register(email: string, password: string, userData: Partial<UserProfile>): Observable<void> {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password)
        .then(async (credential) => {
          const userProfile: UserProfile = {
            email: email,
            name: userData.name || '',
            country: userData.country || '',
            role: userData.role || 'user',
            dateC: new Date()
          };
          await setDoc(doc(this.firestore, 'users', credential.user.uid), userProfile);
          this.userProfile.set(userProfile);
        })
    );
  }

  // Charger le profil utilisateur
  private async loadUserProfile(uid: string): Promise<void> {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    if (userDoc.exists()) {
      this.userProfile.set(userDoc.data() as UserProfile);
    }
  }

  // Déconnexion
  logout(): Observable<void> {
    return from(
      signOut(this.auth).then(() => {
        this.userProfile.set(null);
        this.router.navigate(['/login']);
      })
    );
  }

  // Vérifier si l'utilisateur est admin
  isAdmin(): boolean {
    return this.userProfile()?.role === 'admin';
  }

  // Obtenir le profil actuel
  getUserProfile(): UserProfile | null {
    return this.userProfile();
  }
}