// Add Leaflet typings to window
interface Window {
  L: any;
}

// Multer declaration
declare module 'multer' {
  import { Request } from 'express';
  import { Options } from 'multer';
  
  function multer(options?: Options): any;
  
  namespace multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
    
    interface Files {
      [fieldname: string]: File[];
    }
  }
  
  export = multer;
}

// Add multer property to Express Request
declare namespace Express {
  export interface Request {
    files?: any;
  }
}