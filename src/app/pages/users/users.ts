import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { ConfirmModal } from '../models/confirm-modal/confirm-modal';
import { SuccesModal } from '../models/succes-modal/succes-modal';
import { ErrorModal } from '../models/error-modal/error-modal';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string;
  dateC: any;
  formattedDate?: string;
}

interface PageItem {
  type: 'number' | 'ellipsis';
  value: number | string;
}

@Component({
  selector: 'app-users',
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    ConfirmModal,
    SuccesModal,
    ErrorModal
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
  standalone: true
})
export class Users implements OnInit {
  // Propriétés pour la gestion des données
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = '';
  selectedCountry: string = '';
  selectedSort: string = 'name-asc';
  
  // Propriétés pour les modales
  showUserModal: boolean = false;
  showConfirmModal: boolean = false;
  showSuccessModal: boolean = false;
  showErrorModal: boolean = false;
  
  // Propriétés pour la gestion des formulaires
  userForm: FormGroup;
  editingUser: User | null = null;
  userToDelete: User | null = null;
  
  // Propriétés d'état
  isSubmitting: boolean = false;
  isDeleting: boolean = false;
  formError: string = '';
  successMessage: string = '';
  errorMsg: string = '';

  // Propriétés pour la pagination
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  totalFilteredItems: number = 0;
  startIndex: number = 0;
  endIndex: number = 0;

  // Liste des pays
  countries: string[] = [
    'France', 'Belgique', 'Suisse', 'Canada', 'Maroc', 'Tunisie', 'Algérie',
    'Allemagne', 'Espagne', 'Italie', 'Portugal', 'Royaume-Uni', 'États-Unis'
  ];

  constructor(
    private fb: FormBuilder,
    @Inject(UsersService) private usersService: UsersService
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  ngOnInit() {
    console.log('✅ Component Users initialisé');
    this.loadUsers();
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  private loadUsers() {
    console.log('🔄 Chargement des utilisateurs...');
    this.usersService.getUsers().subscribe({
      next: (users) => {
        console.log('✅ Utilisateurs chargés:', users);
        this.users = users.map(user => ({
          ...user,
          formattedDate: this.formatDate(user.dateC)
        }));
        this.applyFilters();
        this.updatePagination();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        this.errorMsg = 'Erreur lors du chargement des utilisateurs.';
        this.showErrorModal = true;
      }
    });
  }

  // ==================== FILTRES ET RECHERCHE ====================

  applyFilters() {
    let filtered = [...this.users];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.country.toLowerCase().includes(term)
      );
    }

    // Filtre par rôle
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }

    // Filtre par pays
    if (this.selectedCountry) {
      filtered = filtered.filter(user => user.country === this.selectedCountry);
    }

    this.filteredUsers = filtered;
    this.applySort();
    this.currentPage = 1;
    this.updatePagination();
  }

  applySort() {
    switch (this.selectedSort) {
      case 'name-asc':
        this.filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        this.filteredUsers.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date-desc':
        this.filteredUsers.sort((a, b) => new Date(b.dateC).getTime() - new Date(a.dateC).getTime());
        break;
      case 'date-asc':
        this.filteredUsers.sort((a, b) => new Date(a.dateC).getTime() - new Date(b.dateC).getTime());
        break;
      case 'email-asc':
        this.filteredUsers.sort((a, b) => a.email.localeCompare(b.email));
        break;
      case 'email-desc':
        this.filteredUsers.sort((a, b) => b.email.localeCompare(a.email));
        break;
    }
    this.updatePagination();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedCountry = '';
    this.selectedSort = 'name-asc';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.selectedRole || !!this.selectedCountry || this.selectedSort !== 'name-asc';
  }

  // ==================== GESTION DES UTILISATEURS (CRUD) ====================

  createNewUser() {
    console.log('➕ Création nouvel utilisateur');
    this.editingUser = null;
    this.userForm.reset();
    this.formError = '';
    this.showUserModal = true;
  }

  editUser(user: User) {
    console.log('✏️ Modification utilisateur:', user);
    this.editingUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country
    });
    this.formError = '';
    this.showUserModal = true;
  }

  closeUserModal() {
    console.log('❌ Fermeture modal utilisateur');
    this.showUserModal = false;
    this.userForm.reset();
    this.editingUser = null;
    this.formError = '';
    this.isSubmitting = false;
  }

  async onUserSubmit() {
    console.log('📤 Soumission formulaire utilisateur');
    
    this.markFormGroupTouched();
    
    if (this.userForm.invalid) {
      console.log('❌ Formulaire invalide');
      this.formError = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.formError = '';

    try {
      const formValue = this.userForm.value;
      console.log('📝 Valeurs du formulaire:', formValue);

      if (this.editingUser) {
        console.log('🔄 Modification de l\'utilisateur:', this.editingUser.id);
        await this.updateUser(this.editingUser.id, formValue);
        this.successMessage = 'Utilisateur modifié avec succès.';
      } else {
        console.log('🆕 Création nouvel utilisateur');
        await this.createUser(formValue);
        this.successMessage = 'Utilisateur créé avec succès.';
      }

      this.closeUserModal();
      this.showSuccessModal = true;
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde de l\'utilisateur:', error);
      this.errorMsg = error.message || 'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
    }
  }

  private async createUser(userData: any) {
    console.log('🆕 Création utilisateur:', userData);
    
    // Vérifier si l'email existe déjà
    const emailExists = this.users.some(user => 
      user.email.toLowerCase() === userData.email.toLowerCase()
    );
    
    if (emailExists) {
      throw new Error('Un utilisateur avec cet email existe déjà.');
    }

    // Créer l'utilisateur dans Firebase
    const userToCreate = {
      ...userData,
      dateC: new Date()
    };
    
    await this.usersService.createUser(userToCreate);
    
    // Recharger les utilisateurs
    this.loadUsers();
  }

  private async updateUser(id: string, userData: any) {
    console.log('✏️ Mise à jour utilisateur:', id, userData);
    
    // Vérifier si un autre utilisateur a déjà cet email
    const emailExists = this.users.some(user => 
      user.id !== id && user.email.toLowerCase() === userData.email.toLowerCase()
    );
    
    if (emailExists) {
      throw new Error('Un autre utilisateur avec cet email existe déjà.');
    }

    // Mettre à jour l'utilisateur dans Firebase
    await this.usersService.updateUser(id, userData);
    
    // Recharger les utilisateurs
    this.loadUsers();
  }

  confirmDelete(user: User) {
    console.log('🗑️ Confirmation suppression:', user);
    this.userToDelete = user;
    this.showConfirmModal = true;
  }

  onConfirmModalClose(confirmed: boolean) {
    console.log('✅ Confirmation modal:', confirmed);
    this.showConfirmModal = false;
    
    if (confirmed) {
      this.deleteUser();
    } else {
      this.userToDelete = null;
    }
  }

  async deleteUser() {
    if (!this.userToDelete) return;

    console.log('🗑️ Suppression utilisateur:', this.userToDelete);
    this.isDeleting = true;

    try {
      await this.performDelete(this.userToDelete.id);
      this.successMessage = 'Utilisateur supprimé avec succès.';
      this.showSuccessModal = true;
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression de l\'utilisateur:', error);
      this.errorMsg = error.message || 'Une erreur est survenue lors de la suppression. Veuillez réessayer.';
      this.showErrorModal = true;
    } finally {
      this.isDeleting = false;
      this.userToDelete = null;
    }
  }

  private async performDelete(id: string) {
    console.log('🗑️ Suppression utilisateur ID:', id);
    await this.usersService.deleteUser(id);
    this.loadUsers();
  }

  onSuccessModalClose() {
    this.showSuccessModal = false;
    this.successMessage = '';
  }

  onErrorModalClose() {
    this.showErrorModal = false;
    this.errorMsg = '';
  }

  getDeleteMessage(): string {
    if (!this.userToDelete) return '';
    
    return `Êtes-vous sûr de vouloir supprimer l'utilisateur "${this.userToDelete.name}" (${this.userToDelete.email}) ? Cette action est irréversible.`;
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private markFormGroupTouched() {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  formatDate(dateInput: any): string {
    try {
      let date: Date;
      
      if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else {
        date = new Date();
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erreur de formatage de date:', error);
      return 'Date invalide';
    }
  }

  getRoleClass(role: string): string {
    return role.toLowerCase();
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'user': 'Utilisateur',
      'ds': 'Data Scientest'
    };
    return labels[role.toLowerCase()] || role;
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
  }

  // ==================== PAGINATION ====================

  updatePagination() {
    this.totalFilteredItems = this.filteredUsers.length;
    this.totalPages = Math.ceil(this.totalFilteredItems / this.pageSize);
    
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    
    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalFilteredItems);
    
    this.paginatedUsers = this.filteredUsers.slice(this.startIndex, this.endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getVisiblePages(): PageItem[] {
    const pages: PageItem[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push({ type: 'number', value: i });
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push({ type: 'number', value: i });
        pages.push({ type: 'ellipsis', value: '...' });
        pages.push({ type: 'number', value: this.totalPages });
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push({ type: 'number', value: 1 });
        pages.push({ type: 'ellipsis', value: '...' });
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push({ type: 'number', value: i });
        }
      } else {
        pages.push({ type: 'number', value: 1 });
        pages.push({ type: 'ellipsis', value: '...' });
        pages.push({ type: 'number', value: this.currentPage - 1 });
        pages.push({ type: 'number', value: this.currentPage });
        pages.push({ type: 'number', value: this.currentPage + 1 });
        pages.push({ type: 'ellipsis', value: '...' });
        pages.push({ type: 'number', value: this.totalPages });
      }
    }
    
    return pages;
  }

  onPageClick(pageItem: PageItem) {
    if (pageItem.type === 'number') {
      this.goToPage(pageItem.value as number);
    }
  }
}