declare module 'pdf-poppler' {
  export interface PopplerInfo {
    pages: number;
    title?: string;
    author?: string;
    subject?: string;
  }

  export interface PopplerConvertOptions {
    format: 'png' | 'jpeg';
    out_dir: string;
    out_prefix: string;
    page: number | null;
  }

  export function info(filePath: string): Promise<PopplerInfo>;
  export function convert(filePath: string, options: PopplerConvertOptions): Promise<void>;

  const api: {
    info: typeof info;
    convert: typeof convert;
  };

  export default api;
}
