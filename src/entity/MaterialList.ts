import { PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";

export abstract class MaterialList {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    material: string;

    @Column()
    planet: string;

    @Column()
    quantity: number;

    @Column({ type: 'datetime' })
    timestamp: Date;

    @Column({default: false})
    isPrivate: boolean;

    @ManyToOne(type => User)
    user: User;

}
