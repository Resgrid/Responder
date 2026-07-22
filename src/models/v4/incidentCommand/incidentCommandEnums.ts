export enum TacticalObjectiveStatus {
  Pending = 0,
  Complete = 1,
  InProgress = 2,
}

export enum TacticalObjectiveType {
  General = 0,
  Benchmark = 1,
  Safety = 2,
}

export enum IncidentNeedCategory {
  Resource = 0,
  Logistics = 1,
  Medical = 2,
  Equipment = 3,
  Staffing = 4,
  Other = 5,
}

export enum IncidentNeedStatus {
  Open = 0,
  PartiallyMet = 1,
  Met = 2,
  Cancelled = 3,
}
