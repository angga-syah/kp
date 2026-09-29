import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token, retry: false }) : null;

const TTL_PROFIL = 60;
const BATAS_MS = 300;

export type ProfilCache = { nama: string; role: string; aktif: boolean; wajib: boolean };

const kunci = (uid: string) => `profil:${uid}`;

// Redis hanyalah percepatan: gangguan atau lambat tidak boleh memperlambat atau merusak aplikasi.
function batasi<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), BATAS_MS))]);
}

export async function ambilProfil(uid: string): Promise<ProfilCache | null> {
  if (!redis) return null;
  try {
    return await batasi(redis.get<ProfilCache>(kunci(uid)));
  } catch {
    return null;
  }
}

/** Hanya akun aktif yang disimpan, sehingga aktivasi oleh admin langsung berlaku. */
export async function simpanProfil(uid: string, p: ProfilCache) {
  if (!redis || !p.aktif) return;
  try {
    await batasi(redis.set(kunci(uid), p, { ex: TTL_PROFIL }));
  } catch {
    // abaikan
  }
}

export async function hapusProfil(...ids: (string | null | undefined)[]) {
  const keys = ids.filter((i): i is string => !!i).map(kunci);
  if (!redis || keys.length === 0) return;
  try {
    await batasi(redis.del(...keys));
  } catch {
    // abaikan; kedaluwarsa otomatis dalam 60 detik
  }
}
