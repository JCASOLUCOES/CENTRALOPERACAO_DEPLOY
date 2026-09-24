import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loading = false;
  errorMessage = '';
  mostrarSenha = false;
  sessaoExpirada = false;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    senha: ['', [Validators.required]],
    lembrarAcesso: [true]
  });

  private returnUrl = '/';

  constructor() {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.resolverDestino(this.authService.getCurrentUser()?.perfil));
    }
  }

  ngOnInit(): void {
    this.verificarSessaoExpirada();
  }

  private verificarSessaoExpirada(): void {
    if (typeof sessionStorage !== 'undefined') {
      const sessaoExpirada = sessionStorage.getItem('sessaoExpirada');
      if (sessaoExpirada === 'true') {
        sessionStorage.removeItem('sessaoExpirada');
        this.sessaoExpirada = true;
        this.errorMessage = 'Sessão expirada. Faça login para retornar à operação.';
      }
    }
  }

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { usuario, senha, lembrarAcesso } = this.form.getRawValue();
    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ usuario, senha, lembrarAcesso }).subscribe({
      next: (user) => {
        this.loading = false;
        this.router.navigateByUrl(this.resolverDestino(user?.perfil));
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Usuário ou senha inválidos. Verifique suas credenciais e tente novamente.';
      }
    });
  }

  /**
   * Deep-link (returnUrl ≠ '/'/vazio) sempre respeitado;
   * senão qualquer perfil cai na Home '/'.
   */
  private resolverDestino(_perfil?: string): string {
    const alvo = this.returnUrl?.trim() || '/';
    if (alvo !== '/' && alvo !== '') {
      return alvo;
    }
    return '/';
  }
}
