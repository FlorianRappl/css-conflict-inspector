export interface CssInspectorOptions {
  universalPenalty?: number;
  elementPenalty?: number;
  customElementPenalty?: number;
  simpleClassPenalty?: number;
  simplerClassPenalty?: number;
  simplestClassPenalty?: number;
  idPenalty?: number;
  attributePenalty?: number;
}

export interface CssConflict {
  penalty: number;
  message: string;
}
