// Shared types for CodeToDocsAI

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

export interface Documentation {
  id: string;
  fileId: string;
  content: string;
  generatedAt: Date;
}
