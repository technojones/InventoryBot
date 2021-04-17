import {Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Price {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    material: string;

    @Column()
    planet: string;

    @Column()
    price: number;

    @Column({ type: 'datetime' })
    timestamp: Date;

    @ManyToOne(type => User)
    user: User;
}
