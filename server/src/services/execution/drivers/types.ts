export interface ParsedParam {
  type: string;
  name: string;
  raw: string;
}

export interface ParsedMethod {
  returnType: string;
  methodName: string;
  params: ParsedParam[];
  argsStr: string;
  rawSignature: string;
}

export interface DriverMatcher {
  name: string;
  matches(parsed: ParsedMethod): boolean;
  generate(parsed: ParsedMethod, helpers: string): string;
}
