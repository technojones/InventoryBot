import { Entity, PrimaryColumn, Column, ManyToOne, ConnectionOptionsReader } from "typeorm";
import { Corp } from './Corp';

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

    @Column()
    name: string;

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

    @ManyToOne(type => Corp)
        corp: Corp;

}