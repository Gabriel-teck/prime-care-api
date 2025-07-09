import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column()
  phoneNumber: string;

  @Column()
  consultationType: string;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  reason: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  googleMeetLink: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

  @Column('simple-json', { nullable: true })
  rescheduleInfo?: { date: string; time: string };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
