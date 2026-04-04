export interface SafeUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
