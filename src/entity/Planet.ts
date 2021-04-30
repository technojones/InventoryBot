import { PrimaryColumn, Column, Entity } from "typeorm";

@Entity()
export class Planet {

    @PrimaryColumn()
    id: string;

    @Column()
    truncatedName: string;

    @Column()
    name: string;

}