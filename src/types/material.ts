type Material = {
    CategoryName: string,
    CategoryId: string,
    Name: string,
    MatId: string,
    Ticker: string,
    Weight: number,
    Volume: number,
    UserNameSubmitted: string,
    Timestamp: string
}

export type MaterialPayload = Material[];