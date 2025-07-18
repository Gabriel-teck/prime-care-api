import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findByEmail(email: string) {
    return this.repo.findOneBy({ email });
  }

  async findByResetToken(token: string) {
    return this.repo.findOneBy({ resetPasswordToken: token });
  }

  async save(user: User) {
    return this.repo.save(user);
  }

  async findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  async create(data: Partial<User>) {
    return this.repo.save(data);
  }

  // Get all patients (for admins only)
  async findAllPatients() {
    return this.repo.find({
      where: { role: 'patient' },
      order: { fullName: 'ASC' },
    });
  }
}
