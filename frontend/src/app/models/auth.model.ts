export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  matricule: string;
  username: string;
  email: string;
  password: string;
  role: string;
  verificationCode: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  matricule: string;
  email: string;
  role: string;
}

export interface AuthUser {
  token: string;
  username: string;
  matricule: string;
  email: string;
  role: string;
}
