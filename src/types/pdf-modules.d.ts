declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export function getDocument(options: {
    data: Uint8Array
    useWorkerFetch?: boolean
    isEvalSupported?: boolean
    useSystemFonts?: boolean
  }): {
    promise: Promise<{
      numPages: number
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{
          items: unknown[]
        }>
      }>
      destroy(): Promise<void>
    }>
  }
}

declare module 'pdf-parse' {
  export class PDFParse {
    constructor(options: { data: Buffer })
    getText(): Promise<{ text?: string }>
    destroy(): Promise<void>
  }
}
