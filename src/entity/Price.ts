import {Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { MaterialList } from "./MaterialList";

@Entity()
export class Price extends MaterialList {
    @Column()
    price: number;
}

