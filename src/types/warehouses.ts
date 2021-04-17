type warehouseData = {
    WarehouseId: string,
    StoreId: string,
    Units: number,
    WeightCapacity: number,
    VolumeCapacity: number,
    NextPaymentTimestampEpochMs: number,
    FeeAmount: number,
    FeeCurrency: string,
    FeeCollectorId: string,
    FeeCollectorName: string,
    FeeCollectorCode: string,
    LocationName: string,
    LocationNaturalId: string,
    UserNameSubmitted: string,
    Timestamp: string
}

export type warehousePayload = warehouseData[];