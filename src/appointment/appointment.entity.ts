import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  patientId: string; // reference to User

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column()
  phoneNumber: string;

  @Column()
  appointmentType: string;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  reason: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

  @Column('simple-json', { nullable: true })
  rescheduleInfo?: { date: string; time: string };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
