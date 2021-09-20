import {MigrationInterface, QueryRunner} from "typeorm";

export class priceValueType1632171814508 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `inventoryBot`.`price` CHANGE COLUMN `price` `price` DECIMAL(10,2) NOT NULL ;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `inventoryBot`.`price` CHANGE COLUMN `price` `price` INT NOT NULL ;');
    }

}
