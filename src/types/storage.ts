type item = {
    MaterialId: string,
    MaterialName: string,
    MaterialTicker: string,
    MaterialCategory: string,
    MaterialWeight: number,
    MaterialVolume: number,
    MaterialAmount: number,
    Type: string,
    TotalWeight: number,
    TotalVolume: number
}
type storage = {
    StorageItems: item[],
    StorageId: string,
    AddressableId: string,
    Name: string | null,
    WeightLoad: number,
    WeightCapacity: number,
    VolumeLoad: number,
    VolumeCapacity: number,
    FixedStore: boolean,
    Type: string,
    UserNameSubmitted: string,
    Timestamp: string
}

export type storagePayload = storage[];