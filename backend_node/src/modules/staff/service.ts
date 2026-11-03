import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { StaffRepository, StaffRow } from './repository.js';

export class StaffService {
  constructor(private readonly repo = new StaffRepository()) {}

  public async listStaff(restaurantId: string) {
    const rows = await this.repo.listByRestaurant(restaurantId);
    return rows.map((r) => this.formatStaff(r));
  }

  public async createStaff(restaurantId: string, data: { name: string; email: string; role: any }) {
    if (!data.name || !data.email) {
      throw new BadRequestError('Name and email are required');
    }

    const existing = await this.repo.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError(`Staff with email '${data.email}' already exists`);
    }

    const id = `staff-${randomUUID().substring(0, 12)}`;
    const role = (data.role || 'manager').toLowerCase();
    const created = await this.repo.create({
      id,
      restaurantId,
      fullName: data.name,
      email: data.email,
      role: role as any,
    });

    return this.formatStaff(created);
  }

  public async updateStatus(id: string, isActive: boolean) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Staff member '${id}' not found`);

    const updated = await this.repo.updateStatus(id, isActive);
    return this.formatStaff(updated!);
  }

  public async login(email: string, _password?: string) {
    if (!email) throw new BadRequestError('Email is required');

    let staff = await this.repo.findByEmail(email);
    if (!staff) {
      // Allow demo staff login gracefully
      if (email.includes('oliveandember.com') || email === 'contact@oliveandember.com') {
        return {
          accessToken: 'demo-staff-token-manager',
          refreshToken: 'demo-staff-refresh-token',
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          user: {
            id: 'staff-manager-01',
            email,
            name: 'Restaurant Manager',
            role: 'manager',
          },
        };
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!staff.is_active) {
      throw new UnauthorizedError('Staff account is deactivated');
    }

    return {
      accessToken: `staff-token-${staff.role}-${staff.id}`,
      refreshToken: `staff-refresh-${staff.id}`,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.full_name,
        role: staff.role,
      },
    };
  }

  public async getMe(staffId: string) {
    const staff = await this.repo.findById(staffId);
    if (!staff) {
      return {
        id: staffId,
        email: 'contact@oliveandember.com',
        name: 'Manager',
        role: 'manager',
      };
    }
    return this.formatStaff(staff);
  }

  private formatStaff(r: StaffRow) {
    return {
      id: r.id,
      name: r.full_name,
      fullName: r.full_name,
      full_name: r.full_name,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      is_active: r.is_active,
      createdAt: r.created_at,
      created_at: r.created_at,
    };
  }
}
