export interface Measurement {
  customerCode: string;
  measureType: string;
  measureDate: Date;
  measureUUID: string;
  measureValue: number;
  confirmed: boolean;
}
