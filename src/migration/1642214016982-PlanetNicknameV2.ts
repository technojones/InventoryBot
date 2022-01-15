import {MigrationInterface, QueryRunner} from "typeorm";

export class PlanetNicknameV21642214016982 implements MigrationInterface {
    name = 'PlanetNicknameV21642214016982'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_5488780ef6dce3437f3fd38ea4` ON `user`");
        await queryRunner.query("ALTER TABLE `price` DROP COLUMN `price`");
        await queryRunner.query("ALTER TABLE `price` ADD `price` int NOT NULL");
        await queryRunner.query("ALTER TABLE `planet_nickname` ADD CONSTRAINT `FK_549adb86a1defc61352006d1c80` FOREIGN KEY (`planetId`) REFERENCES `planet`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `planet_nickname` ADD CONSTRAINT `FK_12d35f7b6548231f8203a77a4b4` FOREIGN KEY (`corpId`) REFERENCES `corp`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `planet_nickname` DROP FOREIGN KEY `FK_12d35f7b6548231f8203a77a4b4`");
        await queryRunner.query("ALTER TABLE `planet_nickname` DROP FOREIGN KEY `FK_549adb86a1defc61352006d1c80`");
        await queryRunner.query("ALTER TABLE `price` DROP COLUMN `price`");
        await queryRunner.query("ALTER TABLE `price` ADD `price` decimal NOT NULL");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_5488780ef6dce3437f3fd38ea4` ON `user` (`fioDataId`)");
    }

}
