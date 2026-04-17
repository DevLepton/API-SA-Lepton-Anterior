// controllers/clients.controller.js

const NAVIXY_HASH_URL = 'https://api.navixy.com/v2/panel/account/auth?login=9188&password=LeP102012';
const CLIENTS_URL = 'https://api.navixy.com/v2/panel/user/list?hash=';
const TRACKERS_URL = 'https://api.navixy.com/v2/panel/tracker/list?hash=';
const PLANS_URL = 'https://api.navixy.com/v2/panel/tariff/list?hash=';
const SENSOR_BATCH_URL = 'https://api.navixy.com/v2/tracker/sensor/batch_list?hash=';
const SUBUSERS_URL = 'https://pro.lepton-seguridad.com/api-v2/subuser/list?hash=';
const LOGS_URL = 'https://api.navixy.com/v2/user/audit/log/list?hash=';

// ===== CACHE =====
let cache = {};
let lastFetch = {};
const CACHE_TIME = 30000;

const ClientConfig = require('../models/clientConfig.model');

// GET
exports.getClientConfig = async (req, res) => {
  let config = await ClientConfig.findOne();

  if (!config) {
    config = await ClientConfig.create({});
  }

  res.json(config);
};

// UPDATE activos
exports.updateActiveClients = async (req, res) => {
  const { activeClients } = req.body;

  const config = await ClientConfig.findOneAndUpdate(
    {},
    { activeClients },
    { new: true, upsert: true }
  );

  res.json(config);
};

// UPDATE excluidos
exports.updateExcludedAccounts = async (req, res) => {
  const { excludedAccounts } = req.body;

  const config = await ClientConfig.findOneAndUpdate(
    {},
    { excludedAccounts },
    { new: true, upsert: true }
  );

  res.json(config);
};

exports.getFullClientsData = async (req, res) => {
  // 🔥 HEADERS SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const now = Date.now();

    const includeSensors = req.query.includeSensors === 'true';
    const includeLogin = req.query.includeLogin === 'true';

    const cacheKey = `${includeSensors}-${includeLogin}`;

    // ⚡ CACHE (si quieres puedes saltarte progreso aquí)
    if (cache[cacheKey] && (now - lastFetch[cacheKey] < CACHE_TIME)) {
      send({
        done: true,
        progress: 100,
        data: cache[cacheKey]
      });
      return res.end();
    }

    // ===== HASH =====
    send({ progress: 5, message: 'Obteniendo hash...' });

    const hashRes = await fetch(NAVIXY_HASH_URL);
    const { hash } = await hashRes.json();

    // ===== BASE DATA =====
    send({ progress: 15, message: 'Cargando clientes y trackers...' });

    const [clientsRes, trackersRes, plansRes, config] = await Promise.all([
      fetch(CLIENTS_URL + hash),
      fetch(TRACKERS_URL + hash),
      fetch(PLANS_URL + hash),
      ClientConfig.findOne()
    ]);

    const clientsData = await clientsRes.json();
    const trackersData = await trackersRes.json();
    const plansData = await plansRes.json();

    const hashList = config?.activeClients || {};

    const clientes = clientsData.list || [];
    const trackers = trackersData.list || [];
    const plans = plansData.list || [];

    const planById = new Map(plans.map(p => [p.id, p.name]));

    // ===== TRACKERS MAP =====
    send({ progress: 25, message: 'Procesando trackers...' });

    const trackersByClient = new Map();

    trackers.forEach(t => {
      if (!t.user_id) return;

      const tracker = mapTracker(t, planById);

      if (!trackersByClient.has(t.user_id)) {
        trackersByClient.set(t.user_id, []);
      }

      trackersByClient.get(t.user_id).push(tracker);
    });

    // ===== CLIENTES BASE =====
    send({ progress: 35, message: 'Construyendo clientes...' });

    const clientesBase = clientes.map(c => {
      const trackersCliente = trackersByClient.get(c.id) || [];

      const clientHash = hashList?.get
        ? hashList.get(String(c.id))
        : hashList[String(c.id)];

      return {
        raw: c,
        trackers: trackersCliente,
        hash: clientHash || null
      };
    });

    // ===== LOGIN =====
    let loginResults = [];

    if (includeLogin) {
      send({ progress: 45, message: 'Consultando últimos ingresos...' });

      loginResults = [];

      const total = clientesBase.length;
      const batchSize = 20;

      for (let i = 0; i < total; i += batchSize) {
        const chunk = clientesBase.slice(i, i + batchSize);

        const resChunk = await Promise.all(
          chunk.map(async (c) => {
            if (!c.hash) return 'Sin hash registrado';
            return getUltimoIngreso(c.hash, c.raw);
          })
        );

        loginResults.push(...resChunk);

        // 🔥 progreso dinámico
        send({
          progress: 45 + Math.floor((i / total) * 15),
          message: `Procesando logins (${Math.min(i + batchSize, total)}/${total})`
        });
      }
    } else {
      loginResults = clientesBase.map(() => '');
    }

    // ===== CLIENTES FINAL =====
    send({ progress: 65, message: 'Armando respuesta...' });

    let clientesFinal = clientesBase.map((c, i) => {
      const trackers = c.trackers;

      return {
        id: c.raw.id,
        nombre: `${c.raw.first_name || ''} ${c.raw.last_name || ''}`,
        login: c.raw.login,
        ciudad: c.raw.post_city,
        trackers,
        ultimoIngreso: loginResults[i],
        hasHidden: trackers.some(t => t.hidden)
      };
    });

    // ===== SENSORES =====
    if (includeSensors) {
      send({ progress: 70, message: 'Consultando sensores...' });

      const total = clientesBase.length;
      const batchSize = 20;

      const sensoresResultados = [];

      for (let i = 0; i < total; i += batchSize) {
        const chunk = clientesBase.slice(i, i + batchSize);

        const resChunk = await Promise.all(
          chunk.map(async (c) => {
            if (!c.hash || !c.trackers.length) return null;

            const sensores = await getSensorsByClient(c.hash, c.trackers);

            return {
              clientId: c.raw.id,
              sensores
            };
          })
        );

        sensoresResultados.push(...resChunk);

        send({
          progress: 70 + Math.floor((i / total) * 20),
          message: `Procesando sensores (${Math.min(i + batchSize, total)}/${total})`
        });
      }

      const sensoresByCliente = new Map();

      sensoresResultados.forEach(r => {
        if (!r) return;
        sensoresByCliente.set(r.clientId, r.sensores);
      });

      clientesFinal.forEach(c => {
        const sensoresCliente = sensoresByCliente.get(c.id) || {};

        c.trackers = c.trackers.map(t => {
          const sensores = sensoresCliente[t.id];

          const { sdc1, sdc2, sdcAcumulado, canbus } =
            extractSensors(sensores);

          return {
            ...t,
            sdc1,
            sdc2,
            sdcAcumulado,
            canbus
          };
        });
      });
    }

    // ===== RESPONSE =====
    const response = {
      clientes: clientesFinal
    };

    // ===== CACHE =====
    cache[cacheKey] = response;
    lastFetch[cacheKey] = now;

    send({ progress: 95, message: 'Finalizando...' });

    send({
      done: true,
      progress: 100,
      data: response
    });

    res.end();

  } catch (error) {
    console.error('Error full-data:', error.message);

    send({
      error: true,
      message: error.message
    });

    res.end();
  }
};

// ===== TRACKER BASE =====
function mapTracker(t, planById) {
  const tzOffset = -7;

  let lastUTC = t.last_connection || t.creation_date;
  let dt = new Date(lastUTC.replace(' ', 'T'));

  dt.setHours(dt.getHours() + tzOffset);

  const now = new Date();
  const minutos = Math.floor((now - dt) / 60000);

  let años = Math.floor(minutos / 525600);
  let resto = minutos % 525600;

  let meses = Math.floor(resto / 43200);
  resto %= 43200;

  let dias = Math.floor(resto / 1440);
  resto %= 1440;

  let horas = Math.floor(resto / 60);
  let mins = resto % 60;

  let tiempo = '';
  if (años) tiempo += `${años} años `;
  if (meses || años) tiempo += `${meses} meses `;
  if (dias || meses || años) tiempo += `${dias} días `;
  if (horas || dias || meses || años) tiempo += `${horas} horas `;
  tiempo += `${mins} minutos`;

  let status = 'ok';

  if (minutos > 720) {
    if (minutos > 525600) status = 'Offline + 1A';
    else if (minutos > 259200) status = 'Offline + 6M';
    else if (minutos > 43200) status = 'Offline + 1M';
    else if (minutos > 21600) status = 'Offline + 15D';
    else if (minutos > 1440) status = 'Offline + 1D';
    else status = 'Offline + 12H';
  }

  return {
    id: t.id,
    nombre: t.label,
    imei: t.source?.device_id || '',
    sim: t.source?.phone || '',
    modelo: t.source?.model || '',
    plan: planById.get(t.source?.tariff_id) || '',
    clon: t.clone || false,
    suspendido: t.source?.blocked || false,
    hidden: t.deleted || false,
    ultimaConexionUTC: t.last_connection,
    ultimaConexionLocal: dt.toLocaleString('es-MX'),
    minutosOffline: minutos,
    tiempoOffline: tiempo,
    statusSoporte: status,
    online: minutos < 720
  };
}

async function safeFetch(url, retries = 3) {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();

  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return safeFetch(url, retries - 1);
    }

    return null;
  }
}

function chunkArray(arr, size) {
  const res = [];

  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }

  return res;
}

// ===== SENSORES =====
async function getSensorsByClient(hash, trackers) {
  const ids = trackers
    .filter(t => !t.hidden)
    .map(t => t.id);

  if (!ids.length) return {};

  // 🔥 dividir en chunks de 10 trackers
  const chunks = chunkArray(ids, 10);

  const finalResult = {};

  for (const chunk of chunks) {
    const url = `${SENSOR_BATCH_URL}${hash}&trackers=[${chunk.join(',')}]`;
    const data = await safeFetch(url);

    if (!data || !data.result) {
      continue;
    }

    // 🔥 merge resultados
    Object.assign(finalResult, data.result);

    // 🔥 delay entre requests (MUY IMPORTANTE)
    await new Promise(r => setTimeout(r, 500));
  }

  return finalResult;
}

// ===== EXTRAER SENSORES =====
function extractSensors(sensorArr) {
  let sdc1 = '';
  let sdc2 = '';
  let sdcAcumulado = '';
  let canbus = '';

  if (!Array.isArray(sensorArr)) {
    return { sdc1, sdc2, sdcAcumulado, canbus };
  }

  sensorArr.forEach(sensor => {
    const input = (sensor.input_name || '').toLowerCase();

    if (input.includes('can_')) {
      canbus = sensor.input_name;
    }

    if (sensor.sensor_type === 'fuel') {
      const pref = input.includes('obd_') ? 'NO sdc ' : 'sdc ';
      const val = pref + sensor.input_name;

      if (!sdc1) sdc1 = val;
      else if (!sdc2) sdc2 = val;
      else sdcAcumulado = val;
    }
  });

  return { sdc1, sdc2, sdcAcumulado, canbus };
}

// ===== BATCH (ANTI RATE LIMIT) =====
async function batchRequests(tasks, size = 30) {  
  const results = [];

  for (let i = 0; i < tasks.length; i += size) {
    const chunk = tasks.slice(i, i + size);

    const res = await Promise.all(chunk.map(fn => fn()));
    results.push(...res);

    // 🔥 delay más grande
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

function formatDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function formatToDDMMYYYY(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T'));

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

async function getUltimoIngreso(hash, cliente) {

  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const from = encodeURIComponent(formatDate(lastMonth));
    const to = encodeURIComponent(formatDate(now));

    const actions = encodeURIComponent('["user_checkin","user_login"]');
    const sort = encodeURIComponent('["action_datetime=desc"]');

    const urlLogs =
      LOGS_URL + hash +
      `&limit=50&offset=0&actions=${actions}&sort=${sort}&from=${from}&to=${to}`;

    const [subData, logData] = await Promise.all([
      safeFetch(SUBUSERS_URL + hash),
      safeFetch(urlLogs)
    ]);

    const subcuentas = subData?.list || [];
    const logs = logData?.list || [];

    // 🔥 ordenar (por si acaso)
    logs.sort((a, b) =>
      new Date(b.action_date) - new Date(a.action_date)
    );

    const soporte = subcuentas.find(s => s.first_name === 'Soporte Leptón');
    const soporteId = soporte?.id;

    for (const log of logs) {
      if (!log) continue;
      if (log.subuser_id === soporteId) continue;

      let user = '';

      const sub = subcuentas.find(s => s.id == log.subuser_id);

      if (sub) {
        user = `${sub.first_name || ''} ${sub.last_name || ''}`;
      } else if (log.subuser_id == cliente.id) {
        user = `${cliente.first_name || ''} ${cliente.last_name || ''}`;
      }

      return `${formatToDDMMYYYY(log.action_date)} - ${user}`;
    }

    return 'Sin uso en el último mes';

  } catch (e) {
    return 'ERROR LOGIN';
  }
}