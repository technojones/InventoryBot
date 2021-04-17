type buildingMaterials = {
    MaterialId: string,
    MaterialName: string,
    MaterialTicker: string,
    MaterialAmount: number
}
type building = {
    ReclaimableMaterials: buildingMaterials[],
    RepairMaterials: buildingMaterials[],
    BuildingCreated: number,
    BuildingId: string,
    BuildingName: string,
    BuildingTicker: string,
    Condition: number
}
type siteData = {
    Buildings: building[],
    SiteId: string,
    PlanetId: string,
    PlanetIdentifier: string,
    PlanetName: string,
    PlanetFoundedEpochMs: number
}

export type sitesPayload = {
    Sites: siteData[],
    UserNameSubmitted: string
    Timestamp: string
}