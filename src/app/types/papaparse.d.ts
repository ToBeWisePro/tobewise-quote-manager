declare module "papaparse" {
  interface ParseConfig<T> {
    complete?: (results: { data: T[] }) => void;
    error?: (error: { message: string }) => void;
    header?: boolean;
    skipEmptyLines?: boolean;
    transformHeader?: (header: string) => string;
  }

  export function parse<T = unknown>(
    input: string,
    config?: ParseConfig<T>,
  ): void;

  export function unparse(input: unknown): string;
}
