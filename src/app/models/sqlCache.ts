export class SqlCache {
    public id: number = 0;
    public cacheKey: string = '';
    public expiresOn: Date;
    public data: string = '';
}