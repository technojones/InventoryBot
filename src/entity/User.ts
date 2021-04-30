import { Entity, PrimaryColumn, Column, ManyToOne, ConnectionOptionsReader, OneToMany, OneToOne, JoinTable, JoinColumn } from "typeorm";
import { Corp } from './Corp';
import { FIOData } from "./FIOData";

export enum UserRole {
    ADMIN = 10,
    LEAD = 6,
    USER = 3,
    PUBLIC = 0
}

@Entity()
export class User {

    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    companyCode: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    role: UserRole;

    @Column({ default: false })
    hasFIO: boolean;

    @Column({ nullable: true })
    FIOAPIKey?: string;

    @ManyToOne(type => Corp, { eager: true })
    corp: Corp;

    @OneToOne(type => FIOData, fioData => fioData.user, {eager: true, cascade: true})
    @JoinColumn()
    fioData: FIOData;
}