import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { signStaffToken } from '../../utils/jwt.js';
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
      // In development mode only, allow fallback staff demo login
      if (env.NODE_ENV !== 'production' && env.ALLOW_DEMO_AUTH && email.includes('oliveandember.com')) {
        const demoStaff = {
          id: 'staff-manager-01',
          email,
          name: 'Restaurant Manager',
          role: 'manager' as const,
          restaurantId: 'rest-olive-ember-01',
        };
        const token = signStaffToken(demoStaff);
        return {
          accessToken: token,
          refreshToken: `refresh-${randomUUID()}`,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          user: {
            id: demoStaff.id,
            email: demoStaff.email,
            name: demoStaff.name,
            role: demoStaff.role,
          },
        };
      }
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!staff.is_active) {
      throw new UnauthorizedError('Staff account is deactivated');
    }

    const token = signStaffToken({
      id: staff.id,
      email: staff.email,
      name: staff.full_name,
      role: staff.role,
      restaurantId: staff.restaurant_id,
    });

    return {
      accessToken: token,
      refreshToken: `refresh-${staff.id}-${randomUUID().slice(0, 8)}`,
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

