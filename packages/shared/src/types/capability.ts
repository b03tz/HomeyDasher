export interface DeviceCapability {
  id: string;
  type: "boolean" | "number" | "string" | "enum";
  title: string;
  getable: boolean;
  setable: boolean;
  value: unknown;
  min?: number;
  max?: number;
  step?: number;
  units?: string;
  values?: { id: string; title: string }[];
}
