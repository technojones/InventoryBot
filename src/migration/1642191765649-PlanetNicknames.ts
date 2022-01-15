import {MigrationInterface, QueryRunner} from "typeorm";

export class PlanetNicknames1642191765649 implements MigrationInterface {
    name = 'PlanetNicknames1642191765649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `planet_nickname` (`id` int NOT NULL AUTO_INCREMENT, `nickname` varchar(255) NOT NULL, `planetId` varchar(255) NULL, `corpId` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_b19645d079f0a5c8ed9a7879101` FOREIGN KEY (`corpId`) REFERENCES `corp`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_5488780ef6dce3437f3fd38ea47` FOREIGN KEY (`fioDataId`) REFERENCES `fio_data`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `demand` ADD CONSTRAINT `FK_447b99e5e4f16403cbc4d7361fb` FOREIGN KEY (`materialTicker`) REFERENCES `material`(`ticker`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `demand` ADD CONSTRAINT `FK_18ff083bb27c00eabca7cc9a5b4` FOREIGN KEY (`planetId`) REFERENCES `planet`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `demand` ADD CONSTRAINT `FK_152583518482d92b3b620a46dd5` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `inventory` ADD CONSTRAINT `FK_2a96557a91e2ec550a561ee159c` FOREIGN KEY (`materialTicker`) REFERENCES `material`(`ticker`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `inventory` ADD CONSTRAINT `FK_15f0686aa44d32981b3942e770e` FOREIGN KEY (`planetId`) REFERENCES `planet`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `inventory` ADD CONSTRAINT `FK_fe4917e809e078929fe517ab762` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `planet_nickname` ADD CONSTRAINT `FK_549adb86a1defc61352006d1c80` FOREIGN KEY (`planetId`) REFERENCES `planet`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `planet_nickname` ADD CONSTRAINT `FK_12d35f7b6548231f8203a77a4b4` FOREIGN KEY (`corpId`) REFERENCES `corp`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `price` ADD CONSTRAINT `FK_538f200f7af7632a9a7fbb2cc97` FOREIGN KEY (`materialTicker`) REFERENCES `material`(`ticker`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `price` ADD CONSTRAINT `FK_6176c284085a62ff52cfe8d5a92` FOREIGN KEY (`planetId`) REFERENCES `planet`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `price` ADD CONSTRAINT `FK_4e0f084c9bc8bb0992519b8bcca` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `price` DROP FOREIGN KEY `FK_4e0f084c9bc8bb0992519b8bcca`");
        await queryRunner.query("ALTER TABLE `price` DROP FOREIGN KEY `FK_6176c284085a62ff52cfe8d5a92`");
        await queryRunner.query("ALTER TABLE `price` DROP FOREIGN KEY `FK_538f200f7af7632a9a7fbb2cc97`");
        await queryRunner.query("ALTER TABLE `planet_nickname` DROP FOREIGN KEY `FK_12d35f7b6548231f8203a77a4b4`");
        await queryRunner.query("ALTER TABLE `planet_nickname` DROP FOREIGN KEY `FK_549adb86a1defc61352006d1c80`");
        await queryRunner.query("ALTER TABLE `inventory` DROP FOREIGN KEY `FK_fe4917e809e078929fe517ab762`");
        await queryRunner.query("ALTER TABLE `inventory` DROP FOREIGN KEY `FK_15f0686aa44d32981b3942e770e`");
        await queryRunner.query("ALTER TABLE `inventory` DROP FOREIGN KEY `FK_2a96557a91e2ec550a561ee159c`");
        await queryRunner.query("ALTER TABLE `demand` DROP FOREIGN KEY `FK_152583518482d92b3b620a46dd5`");
        await queryRunner.query("ALTER TABLE `demand` DROP FOREIGN KEY `FK_18ff083bb27c00eabca7cc9a5b4`");
        await queryRunner.query("ALTER TABLE `demand` DROP FOREIGN KEY `FK_447b99e5e4f16403cbc4d7361fb`");
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_5488780ef6dce3437f3fd38ea47`");
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_b19645d079f0a5c8ed9a7879101`");
        await queryRunner.query("DROP TABLE `planet_nickname`");
    }

}
