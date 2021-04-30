import { Column, Entity } from "typeorm";
import { MaterialList } from "./MaterialList";

@Entity()
export class Demand extends MaterialList {
    @Column()
    quantity: number;
}
