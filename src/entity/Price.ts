import {Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { MaterialList } from "./MaterialList";

@Entity()
export class Price extends MaterialList {
    @Column({type: 'decimal', precision: 10, scale: 2})
    price: number;
}

