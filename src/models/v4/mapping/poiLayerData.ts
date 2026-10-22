export class PoiLayerData {
  public PoiTypeId: number = 0;
  public Name: string = '';
  public Color: string = '';
  public ImagePath: string = '';
  public PoiImage: string = '';
  public Marker: string = '';
  public IsDestination: boolean = false;
  /** Department-uploaded icon for the layer's POI type (absolute URL); null when none, undefined from older servers. */
  public IconUrl?: string | null;
}
