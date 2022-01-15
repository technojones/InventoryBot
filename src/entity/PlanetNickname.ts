import { PrimaryGeneratedColumn, Column, Entity, ManyToOne } from "typeorm";
import { Corp } from "./Corp";
import { Planet } from "./Planet";

@Entity()
export class PlanetNickname {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Planet, {eager: true})
    planet: Planet;

    @Column()
    nickname: string;

	@ManyToOne(() => Corp, {eager: true})
    corp: Corp;

}