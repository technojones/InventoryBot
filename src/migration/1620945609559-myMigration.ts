import {MigrationInterface, QueryRunner} from "typeorm";

export class myMigration1620945609559 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `betaInventoryBot`.`corp` ADD COLUMN `prefix` VARCHAR(3) NULL AFTER `id`');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `betaInventoryBot`.`corp` DROP COLUMN `prefix`');
    }

}
