export type Mem0MessageRole = 'user' | 'assistant' | 'system';

export type Mem0Message = {
  role: Mem0MessageRole;
  content: string;
};

export type Mem0Response = {
  message: string;
}; 