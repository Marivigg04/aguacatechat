// Envuelve una promesa y garantiza que se resuelva no antes de `ms` milisegundos
export function withMinDelay(promise, ms = 600) {
  return Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms))
  ]).then(([mod]) => mod);
}
