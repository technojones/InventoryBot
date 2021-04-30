import { Column, Entity } from "typeorm";
import { MaterialList } from "./MaterialList";

@Entity()
export class Inventory extends MaterialList {
    @Column()
    quantity: number;
}