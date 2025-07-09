import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages)
  conversation: Conversation;

  @Column()
  sender: 'patient' | 'admin';

  @Column()
  senderId: string;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
