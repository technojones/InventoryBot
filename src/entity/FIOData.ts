import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class FIOData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'json' })
    siteData: object;

    @Column({ type: 'json' })
    storageData: object;

    @Column({ type: 'json' })
    warData: object;

    @Column({ type: 'datetime' })
    siteTS: Date;

    @Column({ type: 'datetime' })
    storageTS: Date;

    @OneToOne(() => User, user => user.fioData)
    user: User;
}