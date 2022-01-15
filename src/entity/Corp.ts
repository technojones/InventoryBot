import {Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Corp {

    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({type: "varchar", length: 3, nullable: true })
    prefix: string;

    @Column({ type: "json", nullable: true })
    boards: {inventory?: string[]
        orders?: string[]};

}
