import { PrimaryColumn, Column, Entity } from "typeorm";

@Entity()
export class Material {

    @PrimaryColumn()
    ticker: string;

    @Column()
    name: string;

    @Column()
    category: string;

    @Column({type: "float"})
    weight: number;

    @Column({type: "float"})
    volume: number;

    async getWeight(quantity?: number) {
        quantity = quantity ? quantity : 1;
        return this.weight * quantity
    }
    async getVolume(quantity?: number) {
        quantity = quantity ? quantity : 1;
        return this.weight * quantity
    }
    async getWeightAndVolume(quantity?: number) {
        quantity = quantity ? quantity : 1;
        return { weight: this.weight * quantity,
            volume: this.volume *quantity };
    }
}