import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Modèle de données pour le template-driven form
  user = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  passwordMismatch = false;

  onSubmit(form: any): void {
    // Vérifier la correspondance des mots de passe
    this.passwordMismatch = this.user.password !== this.user.confirmPassword;
    
    if (form.valid && !this.passwordMismatch) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const { name, email, password } = this.user;
      
      this.authService.register(email, password, {
        name,
        role: 'user' 
      }).subscribe({
        next: () => {
          this.successMessage = 'Compte créé avec succès ! Redirection...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.loading = false;
          console.error('Erreur inscription:', error);
          
          if (error.code === 'auth/email-already-in-use') {
            this.errorMessage = 'Cet email est déjà utilisé';
          } else if (error.code === 'auth/weak-password') {
            this.errorMessage = 'Le mot de passe est trop faible';
          } else if (error.code === 'auth/invalid-email') {
            this.errorMessage = 'Email invalide';
          } else {
            this.errorMessage = 'Erreur lors de l\'inscription. Veuillez réessayer.';
          }
        }
      });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markAllFieldsAsTouched(form);
    }
  }

  // Méthode pour marquer tous les champs comme touchés
  private markAllFieldsAsTouched(form: any): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key];
      control.markAsTouched();
    });
  }

  // Méthode pour vérifier la correspondance des mots de passe en temps réel
  checkPasswordMatch(): void {
    this.passwordMismatch = this.user.password !== this.user.confirmPassword && this.user.confirmPassword !== '';
  }
}