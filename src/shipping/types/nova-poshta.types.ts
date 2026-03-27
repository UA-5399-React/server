export interface NpResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
}

export interface NpCity {
  Ref: string;
  Description: string;
  AreaDescription: string;
  RegionsDescription: string;
}

export interface NpWarehouse {
  Ref: string;
  Number: string;
  Description: string;
  ShortAddress: string;
  TypeOfWarehouse: string;
  CityDescription: string;
}
