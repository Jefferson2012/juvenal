// ============================================================
//  SERVICE WORKER — Juvenal Antonio da Silva Advogados
//  Permite o app funcionar offline e ser instalável
// ============================================================

const VERSAO_CACHE = "juvenal-adv-v1";
const ARQUIVOS_ESSENCIAIS = [
  "/",
  "/index.html",
  "/manifest.json"
];

// --- INSTALAÇÃO: guarda os arquivos essenciais no cache ---
self.addEventListener("install", (evento) => {
  console.log("[SW] Instalando cache...");
  evento.waitUntil(
    caches.open(VERSAO_CACHE).then((cache) => {
      return cache.addAll(ARQUIVOS_ESSENCIAIS);
    })
  );
  self.skipWaiting();
});

// --- ATIVAÇÃO: limpa versões antigas do cache ---
self.addEventListener("activate", (evento) => {
  console.log("[SW] Ativando nova versão...");
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== VERSAO_CACHE)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// --- BUSCA: tenta rede primeiro, usa cache como reserva ---
self.addEventListener("fetch", (evento) => {
  // Não intercepta chamadas a APIs externas
  const url = evento.request.url;
  if (
    url.includes("supabase.co")    ||
    url.includes("anthropic.com")  ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com")    ||
    evento.request.method !== "GET"
  ) {
    return; // deixa passar normalmente
  }

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        // Guarda uma cópia no cache
        const copia = resposta.clone();
        caches.open(VERSAO_CACHE).then((cache) => {
          cache.put(evento.request, copia);
        });
        return resposta;
      })
      .catch(() => {
        // Sem internet? Usa o cache
        return caches.match(evento.request);
      })
  );
});
