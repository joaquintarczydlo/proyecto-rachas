import { API_BASE_URL } from '@/constants/api';
import type { Desafio } from '@/types/desafio';

export async function listarDesafios(): Promise<Desafio[]> {
  const response = await fetch(`${API_BASE_URL}/desafios`);
  if (!response.ok) {
    throw new Error(`El servidor respondió con estado ${response.status}`);
  }
  return (await response.json()) as Desafio[];
}
