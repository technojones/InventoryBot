import {MigrationInterface, QueryRunner} from "typeorm";

export class corpBoards1630975108591 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `corp` ADD COLUMN `boards` JSON NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `corp` DROP COLUMN `boards`');
    }

}
