export class GeoLocation {
    public Latitude: number;
    public Longitude: number;
    public Accuracy: number;
    public Altitude: number;
    public AltitudeAccuracy: number;
    public Heading: number;
    public Speed: number;
    public TimeStamp: Date;

    constructor(latitude: number, longitude: number) {
        this.Latitude = latitude;
        this.Longitude = longitude;
    }
}