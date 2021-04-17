export type User = {
    id: number,
    user: string,
    discord: string,
    discordID: number,
    companyID: string,
    fioUsername: string | null
};
export type identifiedType = "planet" | "user_id" | "number" | "material" | "user" | "discord_mention" | null;
export type queryValue = {
    planet?: string,
    user_id?: User,
    number?: number,
    material?: string,
    user?: User,
    discord_mention?: string,
};