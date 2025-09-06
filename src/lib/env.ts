export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Avertit côté serveur et casse la page (mieux qu'une liste vide silencieuse)
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}
