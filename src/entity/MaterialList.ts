import { PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Material } from "./Material";
import { Planet } from "./Planet";
import { User } from "./User";

export abstract class MaterialList {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Material, {eager: true})
    material: Material;

    @ManyToOne(() => Planet, {eager: true})
    planet: Planet;

    @Column({ type: 'datetime' })
    timestamp: Date;

    @Column({default: false})
    isPrivate?: boolean;

    @ManyToOne(type => User)
    user: User;

}
