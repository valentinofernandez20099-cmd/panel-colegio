const DEMO_KEY = "panel-colegio-demo-data";
const DEFAULT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyVRZyl09F43DNEJgbltl9zC3G0Yvpqq5cMALssOx0RFjErstrstUwcnhKUVZpTnj5J/exec";

const addForm = document.querySelector("#addForm");
const createSheetForm = document.querySelector("#createSheetForm");
const addColumnsForm = document.querySelector("#addColumnsForm");
const deleteSheetForm = document.querySelector("#deleteSheetForm");
const deleteColumnsForm = document.querySelector("#deleteColumnsForm");
const searchForm = document.querySelector("#searchForm");
const editSearchForm = document.querySelector("#editSearchForm");
const editRecordForm = document.querySelector("#editRecordForm");
const resultsList = document.querySelector("#resultsList");
const resultsHint = document.querySelector("#resultsHint");
const editResultsList = document.querySelector("#editResultsList");
const editResultsHint = document.querySelector("#editResultsHint");
const editFormCard = document.querySelector("#editFormCard");
const editFormTitle = document.querySelector("#editFormTitle");
const editDynamicFields = document.querySelector("#editDynamicFields");
const quickResultsList = document.querySelector("#quickResultsList");
const quickResultsHint = document.querySelector("#quickResultsHint");
const manageResultsList = document.querySelector("#manageResultsList");
const manageResultsHint = document.querySelector("#manageResultsHint");
const connectionState = document.querySelector("#connectionState");
const connectionBadge = document.querySelector("#connectionBadge");
const connectionBadgeText = document.querySelector("#connectionBadgeText");
const recordCount = document.querySelector("#recordCount");
const lastAction = document.querySelector("#lastAction");
const recordDialog = document.querySelector("#recordDialog");
const recordDialogTitle = document.querySelector("#recordDialogTitle");
const recordDetailFields = document.querySelector("#recordDetailFields");
const confirmDialog = document.querySelector("#confirmDialog");
const confirmTitle = document.querySelector("#confirmTitle");
const confirmMessage = document.querySelector("#confirmMessage");
const confirmYesButton = document.querySelector("#confirmYesButton");
const confirmNoButton = document.querySelector("#confirmNoButton");
const toast = document.querySelector("#toast");
const toastIcon = document.querySelector("#toastIcon");
const toastText = document.querySelector("#toastText");
const statusHost = document.querySelector("#statusHost");
const statusStrip = document.querySelector("#statusStrip");
const syncButton = document.querySelector("#syncButton");
const statsButton = document.querySelector("#statsButton");
const recentButton = document.querySelector("#recentButton");
const lowStockButton = document.querySelector("#lowStockButton");
const lowStockSearchButton = document.querySelector("#lowStockSearchButton");
const submitButton = document.querySelector("#uploadButton");
const editSearchButton = document.querySelector("#editSearchButton");
const saveEditButton = document.querySelector("#saveEditButton");
const createSheetButton = document.querySelector("#createSheetButton");
const addColumnsButton = document.querySelector("#addColumnsButton");
const deleteSheetButton = document.querySelector("#deleteSheetButton");
const deleteColumnsButton = document.querySelector("#deleteColumnsButton");
const searchButton = searchForm.querySelector('button[type="submit"]');
const quickQueryButtons = Array.from(document.querySelectorAll("[data-query]"));
const sheetSelect = document.querySelector("#sheetSelect");
const columnSheetSelect = document.querySelector("#columnSheetSelect");
const deleteSheetSelect = document.querySelector("#deleteSheetSelect");
const deleteColumnSheetSelect = document.querySelector("#deleteColumnSheetSelect");
const editSheetSelect = document.querySelector("#editSheetSelect");
const dynamicFields = document.querySelector("#dynamicFields");
const dynamicFormHint = document.querySelector("#dynamicFormHint");
const deleteColumnsList = document.querySelector("#deleteColumnsList");

let endpoint = DEFAULT_ENDPOINT;
let isSavingRecord = false;
let isCreatingDemo = false;
let isGoogleActionRunning = false;
let sheetsLoaded = false;
let currentColumns = [];
let editingRecord = null;
let toastTimer = 0;
let lastLowStockAlert = "";
let confirmResolver = null;

syncButton.dataset.defaultLabel = "Sincronizar";
syncButton.addEventListener("click", () => refreshStats({ button: syncButton, notify: true }));
statsButton.addEventListener("click", () => showStats(statsButton));
recentButton.addEventListener("click", () => showRecent(recentButton));
lowStockButton.addEventListener("click", () => showLowStock(lowStockButton, quickResultsList, quickResultsHint));
lowStockSearchButton.addEventListener("click", () => showLowStock(lowStockSearchButton, resultsList, resultsHint));
document.querySelectorAll("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.openView));
});
document.querySelector("#openSheetButton").addEventListener("click", () => {
  window.open("https://docs.google.com/spreadsheets/d/1ZZOssJckqY6AkPYYlYyEo6OmEm-dWVEGOB9D912WG1A/edit", "_blank");
});
document.querySelector("#clearResultsButton").addEventListener("click", () => {
  resultsHint.textContent = "Las consultas apareceran aqui sin mostrar la hoja completa.";
  quickResultsHint.textContent = "Las respuestas de acciones rapidas apareceran aqui.";
  renderEmpty("Sin resultados en pantalla.");
  renderEmpty("Sin resultados en pantalla.", quickResultsList);
  setLastAction("Resultados limpiados");
});
document.querySelector("#closeRecordDialogButton").addEventListener("click", () => recordDialog.close());
confirmNoButton.addEventListener("click", () => closeConfirm(false));
confirmYesButton.addEventListener("click", () => closeConfirm(true));
confirmDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeConfirm(false);
});

quickQueryButtons.forEach((button) => {
  button.addEventListener("click", () => runSearch(button.dataset.query || "", button));
});

sheetSelect.addEventListener("change", () => loadColumnsForSelectedSheet());
deleteColumnSheetSelect.addEventListener("change", () => loadColumnsForDeleteSheet());

createSheetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!beginGoogleAction(createSheetButton, "Creando hoja...")) return;
  try {
    const formData = new FormData(createSheetForm);
    const sheetName = formData.get("sheetName")?.toString() || "";
    const response = await runAction("createSheet", { sheetName });
    createSheetForm.reset();
    sheetsLoaded = false;
    await loadSheets({ force: true });
    if (response.sheetName) {
      sheetSelect.value = response.sheetName;
      columnSheetSelect.value = response.sheetName;
    }
    setLastAction("Hoja creada");
    manageResultsHint.textContent = `Hoja "${response.sheetName || sheetName}" creada.`;
    renderMessage(`Hoja "${response.sheetName || sheetName}" lista para usar.`, manageResultsList);
    showToast("Hoja creada correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(createSheetButton);
  }
});

addColumnsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!beginGoogleAction(addColumnsButton, "Anadiendo...")) return;
  try {
    const formData = new FormData(addColumnsForm);
    const sheetName = formData.get("sheetName")?.toString() || "";
    const columns = splitColumnInput(formData.get("columns")?.toString() || "");
    const response = await runAction("addColumns", { sheetName, columns });
    addColumnsForm.reset();
    columnSheetSelect.value = sheetName;
    if (sheetSelect.value === sheetName) await loadColumnsForSelectedSheet();
    setLastAction("Columnas anadidas");
    manageResultsHint.textContent = `Columnas anadidas a "${sheetName}"`;
    renderMessage(`${response.addedColumns?.length || columns.length} columna(s) anadida(s).`, manageResultsList);
    showToast("Columnas anadidas correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(addColumnsButton);
  }
});

deleteSheetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(deleteSheetForm);
  const sheetName = formData.get("sheetName")?.toString() || "";
  const confirmed = await askConfirmation({
    title: "Borrar hoja",
    message: `Estas seguro de borrar la hoja "${sheetName}"? Esta accion no se puede deshacer desde la app.`,
  });
  if (!confirmed || !beginGoogleAction(deleteSheetButton, "Borrando...")) return;
  try {
    const response = await runAction("deleteSheet", { sheetName });
    deleteSheetForm.reset();
    deleteColumnsList.replaceChildren();
    sheetsLoaded = false;
    await loadSheets({ force: true });
    setLastAction("Hoja borrada");
    manageResultsHint.textContent = `Hoja "${response.sheetName || sheetName}" borrada.`;
    renderMessage(`Hoja "${response.sheetName || sheetName}" eliminada correctamente.`, manageResultsList);
    showToast("Hoja borrada correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(deleteSheetButton);
  }
});

deleteColumnsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(deleteColumnsForm);
  const sheetName = formData.get("sheetName")?.toString() || "";
  const columns = Array.from(deleteColumnsList.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  if (!columns.length) {
    showToast("Selecciona al menos una columna.", "error");
    return;
  }
  const confirmed = await askConfirmation({
    title: "Borrar columnas",
    message: `Estas seguro de borrar ${columns.length} columna(s) de "${sheetName}"?`,
  });
  if (!confirmed || !beginGoogleAction(deleteColumnsButton, "Borrando...")) return;
  try {
    const response = await runAction("deleteColumns", { sheetName, columns });
    await loadColumnsForDeleteSheet();
    if (sheetSelect.value === sheetName) await loadColumnsForSelectedSheet();
    setLastAction("Columnas borradas");
    manageResultsHint.textContent = `Columnas borradas de "${sheetName}"`;
    renderMessage(`${response.deletedColumns?.length || columns.length} columna(s) eliminada(s).`, manageResultsList);
    showToast("Columnas borradas correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(deleteColumnsButton);
  }
});

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSavingRecord) return;
  if (!sheetSelect.value) {
    showToast("Selecciona una hoja antes de subir.", "error");
    sheetSelect.focus();
    return;
  }
  if (!currentColumns.length) {
    showToast("Esta hoja no tiene columnas configuradas.", "error");
    return;
  }
  isSavingRecord = true;
  if (!beginGoogleAction(submitButton, "Subiendo...")) {
    isSavingRecord = false;
    return;
  }
  try {
    const formData = new FormData(addForm);
    const values = currentColumns.reduce((record, column) => {
      record[column] = formData.get(`field:${column}`)?.toString() || "";
      return record;
    }, {});
    await runAction("addDynamicRow", { sheetName: sheetSelect.value, values });
    clearDynamicValues();
    setLastAction("Registro subido");
    showToast("Registro subido correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    isSavingRecord = false;
    endGoogleAction(submitButton);
    updateUploadState();
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = new FormData(searchForm).get("query")?.toString() || "";
  await runSearch(query, searchButton);
});

editSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runEditSearch();
});

editRecordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveEditedRecord();
});

refreshStats();
renderEmpty("Pulsa una consulta para ver resultados.");
renderEmpty("Pulsa una accion rapida para ver resultados.", quickResultsList);
renderEmpty("Crea una hoja o anade columnas para ver el resultado.", manageResultsList);
renderEmpty("Busca un registro para editarlo.", editResultsList);
setConnectionBadge(endpoint ? "checking" : "empty");

async function runSearch(query, button) {
  if (!beginGoogleAction(button, "Consultando...")) return;
  try {
    const response = await runAction("searchSheetRows", { sheetName: "Registros", query, limit: 1000 });
    const rows = flattenSheetRows(response.rows || [], "Registros");
    resultsHint.textContent = query ? `Resultados para "${query}"` : "Todos los resultados disponibles";
    renderRows(rows, resultsList);
    setLastAction("Consulta realizada");
    showToast(rows.length ? `Consulta completada: ${rows.length} resultado(s)` : "Consulta completada sin resultados");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(button);
  }
}

async function showRecent(button, options = { notify: true }) {
  if (!beginGoogleAction(button, "Consultando...")) return;
  try {
    const response = await runAction("searchSheetRows", { sheetName: "Registros", query: "", limit: 1000 });
    const rows = flattenSheetRows(response.rows || [], "Registros").slice(-8).reverse();
    quickResultsHint.textContent = "Ultimos registros guardados";
    renderRows(rows, quickResultsList);
    setLastAction("Ultimos registros");
    if (options.notify) showToast(rows.length ? "Ultimos registros cargados" : "No hay registros recientes");
  } catch (error) {
    setLastAction(error.message);
    if (options.notify) showToast(error.message, "error");
  } finally {
    endGoogleAction(button);
  }
}

async function showStats(button) {
  if (!beginGoogleAction(button, "Calculando...")) return;
  try {
    const response = await runAction("stats", {});
    const stats = response.stats || {};
    const recordsResponse = await runAction("searchSheetRows", { sheetName: "Registros", query: "", limit: 1000 });
    const rows = flattenSheetRows(recordsResponse.rows || [], "Registros");
    quickResultsHint.textContent = rows.length
      ? `Resumen general: ${stats.total || rows.length} registros. Pulsa un registro para ver sus datos.`
      : `Resumen general: ${stats.total || 0} registros`;
    renderRows(rows, quickResultsList);
    recordCount.textContent = String(stats.total || 0);
    setLastAction("Resumen actualizado");
    showToast(`Resumen actualizado: ${stats.total || 0} registro(s)`);
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(button);
  }
}

async function showLowStock(button, targetList = quickResultsList, targetHint = quickResultsHint, options = { notify: true }) {
  if (!beginGoogleAction(button, "Consultando stock...")) return;
  try {
    const response = await runAction("lowStock", {});
    let rows = response.rows || [];
    if (rows.length && !rows[0].__rowNumber) {
      const inventoryResponse = await runAction("searchSheetRows", { sheetName: "INVENTARIO", query: "", limit: 1000 });
      rows = flattenSheetRows(inventoryResponse.rows || [], "INVENTARIO")
        .filter(isLowStockRow)
        .map(addLowStockAlert);
    }
    targetHint.textContent = rows.length
      ? `${rows.length} elemento(s) cerca del stock minimo`
      : "No hay elementos cerca del stock minimo";
    renderRows(rows, targetList);
    setLastAction("Stock revisado");
    if (options.notify) {
      showToast(rows.length ? `${rows.length} elemento(s) cerca del stock minimo` : "Stock correcto");
    }
  } catch (error) {
    setLastAction(error.message);
    if (options.notify) showToast(error.message, "error");
  } finally {
    endGoogleAction(button);
  }
}

async function runEditSearch() {
  if (!beginGoogleAction(editSearchButton, "Buscando...")) return;
  try {
    const formData = new FormData(editSearchForm);
    const sheetName = formData.get("sheetName")?.toString() || "";
    const query = formData.get("query")?.toString() || "";
    if (!sheetName) throw new Error("Selecciona una hoja.");

    const response = await runAction("searchSheetRows", { sheetName, query, limit: 40 });
    const rows = response.rows || [];
    editResultsHint.textContent = rows.length
      ? `${rows.length} registro(s) encontrados en "${sheetName}"`
      : `No hay registros para esa busqueda en "${sheetName}"`;
    renderEditableRows(rows, sheetName, response.columns || []);
    setLastAction("Busqueda para editar");
    showToast(rows.length ? "Registros cargados para editar" : "No hay registros para editar");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(editSearchButton);
  }
}

async function saveEditedRecord() {
  if (!editingRecord) {
    showToast("Selecciona un registro para editar.", "error");
    return;
  }
  if (!beginGoogleAction(saveEditButton, "Guardando...")) return;
  try {
    const formData = new FormData(editRecordForm);
    const values = editingRecord.columns.reduce((record, column) => {
      record[column] = formData.get(`edit:${column}`)?.toString() || "";
      return record;
    }, {});

    await runAction("updateSheetRow", {
      sheetName: editingRecord.sheetName,
      rowNumber: editingRecord.rowNumber,
      values,
    });

    editingRecord = { ...editingRecord, values };
    setLastAction("Registro editado");
    showToast("Registro actualizado correctamente");
    openEditForm(editingRecord.sheetName, editingRecord.rowNumber, values, editingRecord.columns);
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(saveEditButton);
  }
}

async function createConnectionDemo() {
  if (isCreatingDemo) return;
  isCreatingDemo = true;
  try {
    await runAction("addItem", {
      elemento: "DEMO CONEXION CODEX",
      categoria: "Demostracion",
      ubicacion: "App local",
      estado: "Disponible",
      notas: `Creado desde la app el ${new Date().toLocaleString("es-ES")}`,
    });
    setLastAction("Demo guardada en Google Sheets");
    showToast("Demo subida correctamente");
    const response = await runAction("search", { query: "DEMO CONEXION CODEX" });
    quickResultsHint.textContent = 'Resultados para "DEMO CONEXION CODEX"';
    renderRows(response.rows || [], quickResultsList);
    setLastAction("Consulta realizada");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    isCreatingDemo = false;
  }
}

async function refreshStats(options = {}) {
  if (options.button && !beginGoogleAction(options.button, "Sincronizando...")) return;
  if (!endpoint) {
    connectionState.textContent = "Modo prueba local";
    setConnectionBadge("empty");
  } else if (!hasValidEndpoint()) {
    connectionState.textContent = "URL no valida";
    setConnectionBadge("invalid");
    setLastAction("Revisa la URL de conexion");
    if (options.notify) showToast("La conexion debe ser una URL publicada de Apps Script.", "error");
    if (options.button) endGoogleAction(options.button);
    return;
  } else {
    connectionState.textContent = "Google Sheets conectado";
    setConnectionBadge("checking");
  }
  try {
    const response = await runAction("stats", {});
    recordCount.textContent = String(response.stats?.total || 0);
    setConnectionBadge(endpoint ? "online" : "empty");
    checkLowStockAlert();
    if (options.notify) showToast("Sincronizacion completada");
  } catch (error) {
    connectionState.textContent = "Revisar conexion";
    setConnectionBadge(endpoint ? "offline" : "empty");
    setLastAction(error.message);
    if (options.notify) showToast(error.message, "error");
  } finally {
    if (options.button) endGoogleAction(options.button);
  }
}

async function checkLowStockAlert() {
  try {
    const response = await runAction("lowStock", {});
    const rows = response.rows || [];
    const alertKey = rows.map((row) => `${getRecordTitle(row)}:${row["STOCK ACTUAL"]}:${row["STOCK MINIMO"]}`).join("|");
    if (rows.length && alertKey !== lastLowStockAlert) {
      lastLowStockAlert = alertKey;
      const firstTitle = getRecordTitle(rows[0]);
      showToast(
        rows.length === 1
          ? `${firstTitle} esta cerca del stock minimo`
          : `${rows.length} elementos estan cerca del stock minimo`,
        "warning",
      );
      return true;
    }
  } catch (error) {
    // El script publicado puede estar pendiente de actualizar; no bloqueamos la app por esta alerta.
  }
  return false;
}

async function loadSheets(options = {}) {
  if (sheetsLoaded && !options.force) return;
  setButtonLoading(submitButton, true, "Cargando hojas...");
  sheetSelect.disabled = true;
  columnSheetSelect.disabled = true;
  deleteSheetSelect.disabled = true;
  deleteColumnSheetSelect.disabled = true;
  try {
    const response = await runAction("listSheets", {});
    const sheets = response.sheets || [];
    sheetSelect.replaceChildren(new Option("Selecciona una hoja", ""));
    columnSheetSelect.replaceChildren(new Option("Selecciona una hoja", ""));
    deleteSheetSelect.replaceChildren(new Option("Selecciona una hoja", ""));
    deleteColumnSheetSelect.replaceChildren(new Option("Selecciona una hoja", ""));
    editSheetSelect.replaceChildren(new Option("Selecciona una hoja", ""));
    sheets.forEach((sheet) => sheetSelect.appendChild(new Option(sheet, sheet)));
    sheets.forEach((sheet) => columnSheetSelect.appendChild(new Option(sheet, sheet)));
    sheets.forEach((sheet) => deleteSheetSelect.appendChild(new Option(sheet, sheet)));
    sheets.forEach((sheet) => deleteColumnSheetSelect.appendChild(new Option(sheet, sheet)));
    sheets.forEach((sheet) => editSheetSelect.appendChild(new Option(sheet, sheet)));
    sheetsLoaded = true;
    dynamicFormHint.textContent = sheets.length
      ? "Selecciona una hoja para cargar sus columnas."
      : "No hay hojas disponibles en el archivo.";
    showToast("Hojas cargadas");
  } catch (error) {
    dynamicFormHint.textContent = error.message;
    showToast(error.message, "error");
  } finally {
    sheetSelect.disabled = false;
    columnSheetSelect.disabled = false;
    deleteSheetSelect.disabled = false;
    deleteColumnSheetSelect.disabled = false;
    editSheetSelect.disabled = false;
    setButtonLoading(submitButton, false);
    updateUploadState();
  }
}

async function loadColumnsForSelectedSheet() {
  currentColumns = [];
  dynamicFields.replaceChildren();
  updateUploadState();

  const sheetName = sheetSelect.value;
  if (!sheetName) {
    dynamicFormHint.textContent = "Elige una hoja para cargar sus columnas.";
    return;
  }

  setButtonLoading(submitButton, true, "Cargando columnas...");
  sheetSelect.disabled = true;
  try {
    const response = await runAction("getSheetColumns", { sheetName });
    currentColumns = response.columns || [];
    renderDynamicFields(currentColumns);
    dynamicFormHint.textContent = currentColumns.length
      ? `${currentColumns.length} columnas encontradas en "${sheetName}".`
      : `La hoja "${sheetName}" no tiene encabezados en la primera fila.`;
    showToast(currentColumns.length ? "Columnas cargadas" : "No se encontraron columnas");
  } catch (error) {
    dynamicFormHint.textContent = error.message;
    showToast(error.message, "error");
  } finally {
    sheetSelect.disabled = false;
    setButtonLoading(submitButton, false);
    updateUploadState();
  }
}

function renderDynamicFields(columns) {
  dynamicFields.replaceChildren();
  columns.forEach((column) => {
    const label = document.createElement("label");
    label.className = "field";
    const span = document.createElement("span");
    span.textContent = column;
    const input = document.createElement("input");
    input.name = `field:${column}`;
    input.autocomplete = "off";
    input.placeholder = column;
    label.append(span, input);
    dynamicFields.appendChild(label);
  });
}

function clearDynamicValues() {
  dynamicFields.querySelectorAll("input, textarea, select").forEach((field) => {
    field.value = "";
  });
}

function updateUploadState() {
  submitButton.disabled = !sheetSelect.value || !currentColumns.length;
}

async function loadColumnsForDeleteSheet() {
  deleteColumnsList.replaceChildren();
  const sheetName = deleteColumnSheetSelect.value;
  if (!sheetName) {
    renderCheckboxMessage("Selecciona una hoja para ver sus columnas.");
    return;
  }

  setButtonLoading(deleteColumnsButton, true, "Cargando columnas...");
  deleteColumnSheetSelect.disabled = true;
  try {
    const response = await runAction("getSheetColumns", { sheetName });
    renderDeleteColumnOptions(response.columns || []);
  } catch (error) {
    renderCheckboxMessage(error.message);
    showToast(error.message, "error");
  } finally {
    deleteColumnSheetSelect.disabled = false;
    setButtonLoading(deleteColumnsButton, false);
  }
}

function renderDeleteColumnOptions(columns) {
  deleteColumnsList.replaceChildren();
  if (!columns.length) {
    renderCheckboxMessage("Esta hoja no tiene columnas para borrar.");
    return;
  }

  columns.forEach((column) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = column;
    const span = document.createElement("span");
    span.textContent = column;
    label.append(input, span);
    deleteColumnsList.appendChild(label);
  });
}

function renderCheckboxMessage(message) {
  deleteColumnsList.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "checkbox-empty";
  empty.textContent = message;
  deleteColumnsList.appendChild(empty);
}

async function runAction(action, payload) {
  if (!endpoint) return runDemoAction(action, payload);

  const data = await requestGoogle(action, payload);
  if (!data.ok) throw new Error(formatGoogleError(data.error));
  return data;
}

function formatGoogleError(error) {
  const message = error || "No se pudo completar la accion.";
  if (message.includes("Accion no reconocida")) {
    return "Apps Script esta sin actualizar. Publica una nueva version con el Code.gs actual.";
  }
  return message;
}

function requestGoogle(action, payload) {
  return new Promise((resolve, reject) => {
    const callback = `panelColegio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(endpoint);
    url.searchParams.set("action", action);
    url.searchParams.set("payload", JSON.stringify(payload || {}));
    url.searchParams.set("callback", callback);

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google tardo demasiado en responder."));
    }, 15000);

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("No se pudo contactar con Google."));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function runDemoAction(action, payload) {
  const rows = loadDemoRows();
  if (action === "listSheets") {
    return { ok: true, sheets: loadDemoSheets().map((sheet) => sheet.name) };
  }

  if (action === "getSheetColumns") {
    const sheet = getDemoSheet(payload.sheetName);
    return { ok: true, columns: sheet.columns };
  }

  if (action === "createSheet") {
    const sheetName = normalizeSheetName(payload.sheetName);
    const sheets = loadDemoSheets();
    if (sheets.some((sheet) => sheet.name.toLowerCase() === sheetName.toLowerCase())) {
      throw new Error(`Ya existe la hoja "${sheetName}".`);
    }
    sheets.push({ name: sheetName, columns: [] });
    saveDemoSheets(sheets);
    return { ok: true, sheetName };
  }

  if (action === "addColumns") {
    const columns = splitColumnInput(payload.columns || []);
    if (!columns.length) throw new Error("Escribe al menos una columna.");
    const sheets = loadDemoSheets();
    const sheet = sheets.find((item) => item.name === payload.sheetName);
    if (!sheet) throw new Error(`No existe la hoja "${payload.sheetName}".`);
    const existing = new Set(sheet.columns.map((column) => column.toLowerCase()));
    const addedColumns = columns.filter((column) => !existing.has(column.toLowerCase()));
    sheet.columns.push(...addedColumns);
    saveDemoSheets(sheets);
    return { ok: true, addedColumns, columns: sheet.columns };
  }

  if (action === "deleteSheet") {
    const sheetName = normalizeSheetName(payload.sheetName);
    const sheets = loadDemoSheets();
    if (sheets.length <= 1) throw new Error("No se puede borrar la unica hoja disponible.");
    const nextSheets = sheets.filter((sheet) => sheet.name !== sheetName);
    if (nextSheets.length === sheets.length) throw new Error(`No existe la hoja "${sheetName}".`);
    saveDemoSheets(nextSheets);
    return { ok: true, sheetName };
  }

  if (action === "deleteColumns") {
    const columns = splitColumnInput(payload.columns || []);
    if (!columns.length) throw new Error("Selecciona al menos una columna.");
    const sheets = loadDemoSheets();
    const sheet = sheets.find((item) => item.name === payload.sheetName);
    if (!sheet) throw new Error(`No existe la hoja "${payload.sheetName}".`);
    const deleteSet = new Set(columns.map((column) => column.toLowerCase()));
    const deletedColumns = sheet.columns.filter((column) => deleteSet.has(column.toLowerCase()));
    if (!deletedColumns.length) throw new Error("No encuentro esas columnas.");
    sheet.columns = sheet.columns.filter((column) => !deleteSet.has(column.toLowerCase()));
    saveDemoSheets(sheets);
    return { ok: true, deletedColumns, columns: sheet.columns };
  }

  if (action === "addDynamicRow") {
    rows.push({
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      ...(payload.values || {}),
    });
    saveDemoRows(rows);
    return { ok: true };
  }

  if (action === "searchSheetRows") {
    const sheet = getDemoSheet(payload.sheetName);
    const query = String(payload.query || "").trim().toLowerCase();
    const matches = rows
      .map((row, index) => ({ rowNumber: index + 2, values: row }))
      .filter((item) => !query || Object.values(item.values).some((value) => String(value).toLowerCase().includes(query)))
      .slice(0, Number(payload.limit || 40));
    return { ok: true, columns: sheet.columns, rows: matches };
  }

  if (action === "updateSheetRow") {
    const index = Number(payload.rowNumber) - 2;
    if (index < 0 || index >= rows.length) throw new Error("No encuentro ese registro.");
    rows[index] = { ...rows[index], ...(payload.values || {}) };
    saveDemoRows(rows);
    return { ok: true, row: rows[index] };
  }

  if (action === "updateSheetCell") {
    const index = Number(payload.rowNumber) - 2;
    if (index < 0 || index >= rows.length) throw new Error("No encuentro ese registro.");
    rows[index] = { ...rows[index], [payload.columnName]: payload.value || "" };
    saveDemoRows(rows);
    return { ok: true, rowNumber: payload.rowNumber, columnName: payload.columnName, value: payload.value || "" };
  }

  if (action === "addItem") {
    rows.push({
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      elemento: payload.elemento || "",
      categoria: payload.categoria || "",
      ubicacion: payload.ubicacion || "",
      estado: payload.estado || "",
      notas: payload.notas || "",
    });
    saveDemoRows(rows);
    return { ok: true, row: rows.at(-1) };
  }

  if (action === "search") {
    const query = String(payload.query || "").trim().toLowerCase();
    const matches = query
      ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query)))
      : rows;
    return { ok: true, rows: matches };
  }

  if (action === "recent") {
    return { ok: true, rows: rows.slice(-Number(payload.limit || 8)).reverse() };
  }

  if (action === "lowStock") {
    return {
      ok: true,
      rows: [
        {
          "NOMBRE DEL ARTÍCULO/ DESCRIPCIÓN": "Toner demo",
          "CODIGO DEL MATERIAL": "DEMO-STOCK-01",
          CATEGORIA: "Consumible",
          "STOCK ACTUAL": 2,
          "STOCK MINIMO": 1,
          ESTADO: "Cerca del minimo",
          "ALERTA STOCK": "Esta a 1 unidad del stock minimo",
        },
      ],
    };
  }

  if (action === "stats") {
    return { ok: true, stats: buildStats(rows) };
  }

  return { ok: true };
}

const HEADERS_DEMO = ["id", "fecha", "elemento", "categoria", "ubicacion", "estado", "notas"];

function loadDemoRows() {
  const saved = localStorage.getItem(DEMO_KEY);
  if (saved) return JSON.parse(saved);
  const initial = [
    {
      id: "demo-1",
      fecha: new Date().toISOString(),
      elemento: "Proyector",
      categoria: "Tecnologia",
      ubicacion: "Aula 2A",
      estado: "Disponible",
      notas: "",
    },
    {
      id: "demo-2",
      fecha: new Date().toISOString(),
      elemento: "Balones",
      categoria: "Deporte",
      ubicacion: "Gimnasio",
      estado: "Revisar",
      notas: "Contar unidades",
    },
  ];
  saveDemoRows(initial);
  return initial;
}

function saveDemoRows(rows) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
}

function loadDemoSheets() {
  const saved = localStorage.getItem(`${DEMO_KEY}-sheets`);
  if (saved) return JSON.parse(saved);
  const initial = [
    { name: "Registros", columns: HEADERS_DEMO },
    { name: "Inventario demo", columns: ["Elemento", "Categoria", "Ubicacion", "Estado", "Notas"] },
  ];
  saveDemoSheets(initial);
  return initial;
}

function saveDemoSheets(sheets) {
  localStorage.setItem(`${DEMO_KEY}-sheets`, JSON.stringify(sheets));
}

function getDemoSheet(sheetName) {
  const sheet = loadDemoSheets().find((item) => item.name === sheetName);
  if (!sheet) throw new Error(`No existe la hoja "${sheetName}".`);
  return sheet;
}

function normalizeSheetName(sheetName) {
  const name = String(sheetName || "").trim();
  if (!name) throw new Error("Escribe un nombre para la hoja.");
  return name;
}

function splitColumnInput(value) {
  const source = Array.isArray(value) ? value.join("\n") : String(value || "");
  return [...new Set(source.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))];
}

function buildStats(rows) {
  return rows.reduce(
    (stats, row) => {
      stats.total += 1;
      const status = row.estado || row.ESTADO || row.Estado || "Sin estado";
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      return stats;
    },
    { total: 0, byStatus: {} },
  );
}

function renderRows(rows, target = resultsList) {
  target.replaceChildren();
  if (!rows.length) {
    renderEmpty("No hay resultados para esta consulta.", target);
    return;
  }

  const controls = document.createElement("div");
  controls.className = "results-controls";

  const searchLabel = document.createElement("label");
  searchLabel.className = "field";
  const searchText = document.createElement("span");
  searchText.textContent = "Buscar en resultados";
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.placeholder = "Escribe para filtrar...";
  searchInput.autocomplete = "off";
  searchLabel.append(searchText, searchInput);

  const sortLabel = document.createElement("label");
  sortLabel.className = "field";
  const sortText = document.createElement("span");
  sortText.textContent = "Ordenar por";
  const sortSelect = document.createElement("select");
  [
    ["", "Sin ordenar"],
    ["name", "Nombre"],
    ["stock", "Stock"],
    ["category", "Categoria"],
  ].forEach(([value, label]) => sortSelect.appendChild(new Option(label, value)));
  sortLabel.append(sortText, sortSelect);

  const counter = document.createElement("p");
  counter.className = "results-counter";
  controls.append(searchLabel, sortLabel, counter);

  const cards = document.createElement("div");
  cards.className = "results-cards";
  target.append(controls, cards);

  const applyFilters = () => {
    const query = normalizeSearchText(searchInput.value);
    const sortBy = sortSelect.value;
    const filteredRows = rows
      .filter((row) => !query || normalizeSearchText(Object.values(row).map(formatFieldValue).join(" ")).includes(query))
      .sort((left, right) => compareRows(left, right, sortBy));

    counter.textContent = `${filteredRows.length} de ${rows.length} registro(s)`;
    renderRowCards(filteredRows, cards);
  };

  searchInput.addEventListener("input", applyFilters);
  sortSelect.addEventListener("change", applyFilters);
  applyFilters();
}

function flattenSheetRows(rows, sheetName) {
  return rows.map((item) => {
    const values = item.values || item;
    if (item.rowNumber) {
      return {
        ...values,
        __sheetName: values.__sheetName || sheetName,
        __rowNumber: values.__rowNumber || item.rowNumber,
      };
    }
    return values;
  });
}

function isLowStockRow(row) {
  const stock = getRecordStock(row);
  const minimum = getRecordMinimumStock(row);
  return Number.isFinite(stock) && Number.isFinite(minimum) && stock <= minimum + 1;
}

function addLowStockAlert(row) {
  const stock = getRecordStock(row);
  const minimum = getRecordMinimumStock(row);
  return {
    ...row,
    "ALERTA STOCK": stock <= minimum ? "Stock en minimo o por debajo del minimo" : "Stock a 1 unidad del minimo",
  };
}

function renderRowCards(rows, target) {
  target.replaceChildren();
  if (!rows.length) {
    renderEmpty("No hay resultados con ese filtro.", target);
    return;
  }

  rows.forEach((row) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "result-card";
    card.addEventListener("click", () => showRecordDetails(row));

    const title = document.createElement("strong");
    title.textContent = getRecordTitle(row);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    getRecordSummary(row).forEach((text) => {
      const item = document.createElement("span");
      item.className = "pill";
      item.textContent = text;
      meta.appendChild(item);
    });

    card.append(title, meta);
    target.appendChild(card);
  });
}

function compareRows(left, right, sortBy) {
  if (!sortBy) return 0;
  if (sortBy === "stock") return getRecordStock(left) - getRecordStock(right);
  const leftValue = sortBy === "category" ? getRecordCategory(left) : getRecordTitle(left);
  const rightValue = sortBy === "category" ? getRecordCategory(right) : getRecordTitle(right);
  return leftValue.localeCompare(rightValue, "es", { sensitivity: "base", numeric: true });
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getRecordStock(row) {
  const value = row["STOCK ACTUAL"] || row.stock || row.Stock || row.STOCK || row["stock actual"];
  const number = Number(String(value || "").replace(",", ".").trim());
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

function getRecordMinimumStock(row) {
  const value = row["STOCK MINIMO"] || row["STOCK MÍNIMO"] || row.stockMinimo || row["stock minimo"];
  const number = Number(String(value || "").replace(",", ".").trim());
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

function getRecordCategory(row) {
  return row.categoria || row.CATEGORIA || row.Categoria || "";
}

function renderEditableRows(rows, sheetName, columns = []) {
  editResultsList.replaceChildren();
  editFormCard.hidden = true;
  editingRecord = null;

  if (!rows.length) {
    renderEmpty("No hay registros para editar.", editResultsList);
    return;
  }

  rows.forEach((item) => {
    const row = item.values || item;
    const card = document.createElement("article");
    card.className = "edit-result-card";

    const title = document.createElement("strong");
    title.textContent = getRecordTitle(row);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    getRecordSummary(row).forEach((text) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = text;
      meta.appendChild(pill);
    });

    const actions = document.createElement("div");
    actions.className = "result-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.textContent = "Editar";
    button.addEventListener("click", () => openEditForm(sheetName, item.rowNumber, row, columns.length ? columns : Object.keys(row)));
    actions.appendChild(button);

    card.append(title, meta, actions);
    editResultsList.appendChild(card);
  });
}

function openEditForm(sheetName, rowNumber, values, columns) {
  const safeColumns = columns?.length ? columns : Object.keys(values);
  editingRecord = { sheetName, rowNumber, values, columns: safeColumns };
  editFormTitle.textContent = `Editando: ${getRecordTitle(values)}`;
  editDynamicFields.replaceChildren();

  safeColumns.forEach((column) => {
    const label = document.createElement("label");
    label.className = "field";
    const span = document.createElement("span");
    span.textContent = column;
    const input = document.createElement("input");
    input.name = `edit:${column}`;
    input.autocomplete = "off";
    input.value = values[column] === null || values[column] === undefined ? "" : String(values[column]);
    label.append(span, input);
    editDynamicFields.appendChild(label);
  });

  editFormCard.hidden = false;
  editFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getRecordTitle(row) {
  return (
    row.elemento ||
    row["NOMBRE DEL ARTÍCULO/ DESCRIPCIÓN"] ||
    row["NOMBRE DEL ARTICULO/ DESCRIPCION"] ||
    row["CODIGO DEL MATERIAL"] ||
    row.id ||
    "Registro"
  );
}

function getRecordSummary(row) {
  const preferred = [
    row.categoria,
    row.ubicacion,
    row.estado,
    row["CATEGORIA"],
    row["UBICACIÓN"],
    row["UBICACION"],
    row["ESTADO"],
    row["TIPO DE MATERIAL"],
    row["STOCK ACTUAL"],
    row["ALERTA STOCK"],
  ];
  const summary = preferred.filter(Boolean).map(formatFieldValue);
  if (summary.length) return summary.slice(0, 5);
  return Object.entries(row)
    .filter(([key, value]) => !isHiddenDetailField(key) && value !== "" && value !== null && value !== undefined)
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${formatFieldValue(value)}`);
}

function showRecordDetails(row) {
  recordDialogTitle.textContent = getRecordTitle(row);
  recordDetailFields.replaceChildren();

  Object.entries(row).forEach(([key, value]) => {
    if (isHiddenDetailField(key)) return;
    recordDetailFields.appendChild(createDetailField(row, key, value));
  });

  if (!recordDetailFields.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Este registro no tiene campos para mostrar.";
    recordDetailFields.appendChild(empty);
  }

  recordDialog.showModal();
}

function isHiddenDetailField(key) {
  const normalized = String(key || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized.startsWith("__") || ["id", "uuid", "rowid", "rownumber", "rownum", "sheetname"].includes(normalized);
}

function createDetailField(row, key, value) {
  const field = document.createElement("div");
  field.className = "detail-field";
  field.dataset.fieldKey = key;

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "field-edit-button";
  editButton.setAttribute("aria-label", `Editar ${key}`);
  editButton.innerHTML = '<span class="edit-pencil-icon" aria-hidden="true"></span>';
  editButton.addEventListener("click", () => startInlineFieldEdit(field, row, key));

  const content = document.createElement("div");
  content.className = "detail-field-content";

  const label = document.createElement("span");
  label.textContent = key;

  const output = document.createElement("strong");
  output.textContent = formatFieldValue(value);

  content.append(label, output);
  field.append(editButton, content);
  return field;
}

function startInlineFieldEdit(field, row, key) {
  if (field.classList.contains("is-editing")) return;
  if (!canEditRecord(row)) {
    showToast("Actualiza Apps Script para editar este registro desde el detalle.", "error");
    return;
  }
  if (typeof row[key] === "object" && row[key] !== null) {
    showToast("Este campo no se puede editar desde la app.", "error");
    return;
  }

  field.classList.add("is-editing");
  const currentValue = row[key] === null || row[key] === undefined ? "" : String(row[key]);
  const content = field.querySelector(".detail-field-content");
  content.replaceChildren();

  const label = document.createElement("span");
  label.textContent = key;
  const input = document.createElement("input");
  input.value = currentValue;
  input.autocomplete = "off";

  const actions = document.createElement("div");
  actions.className = "field-edit-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary";
  saveButton.textContent = "Guardar";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancelar";

  saveButton.addEventListener("click", () => saveInlineField(field, row, key, input.value));
  cancelButton.addEventListener("click", () => replaceDetailField(field, row, key));

  actions.append(saveButton, cancelButton);
  content.append(label, input, actions);
  input.focus();
}

async function saveInlineField(field, row, key, value) {
  const saveButton = field.querySelector(".field-edit-actions .primary");
  if (!beginGoogleAction(saveButton, "Guardando...")) return;
  try {
    try {
      await runAction("updateSheetCell", {
        sheetName: row.__sheetName,
        rowNumber: row.__rowNumber,
        columnName: key,
        value,
      });
    } catch (error) {
      if (!error.message.includes("Apps Script esta sin actualizar")) throw error;
      await runAction("updateSheetRow", {
        sheetName: row.__sheetName,
        rowNumber: row.__rowNumber,
        values: getEditableRecordValues(row, key, value),
      });
    }
    row[key] = value;
    replaceDetailField(field, row, key);
    recordDialogTitle.textContent = getRecordTitle(row);
    setLastAction("Campo editado");
    showToast("Campo actualizado correctamente");
  } catch (error) {
    setLastAction(error.message);
    showToast(error.message, "error");
  } finally {
    endGoogleAction(saveButton);
  }
}

function replaceDetailField(field, row, key) {
  const nextField = createDetailField(row, key, row[key]);
  field.replaceWith(nextField);
}

function canEditRecord(row) {
  return Boolean(row.__sheetName && row.__rowNumber);
}

function getEditableRecordValues(row, changedKey, changedValue) {
  return Object.entries(row).reduce((values, [key, value]) => {
    if (!isHiddenDetailField(key)) values[key] = key === changedKey ? changedValue : value;
    return values;
  }, {});
}

function formatFieldValue(value) {
  if (value === "" || value === null || value === undefined) return "Sin dato";
  if (typeof value === "object") {
    if (value.valueType === "IMAGE") return "Imagen en celda";
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "Dato no textual";
    }
  }
  return String(value);
}

function renderEmpty(message, target = resultsList) {
  target.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  target.appendChild(empty);
}

function renderMessage(message, target = resultsList) {
  target.replaceChildren();
  const card = document.createElement("article");
  card.className = "result-card";
  const title = document.createElement("strong");
  title.textContent = message;
  card.appendChild(title);
  target.appendChild(card);
}

function setLastAction(message) {
  lastAction.textContent = message;
}

function setConnectionBadge(state) {
  connectionBadge.classList.remove("is-empty", "is-online", "is-offline", "is-checking");
  connectionBadge.classList.add(`is-${state}`);
  const labels = {
    empty: "Sin conexion",
    invalid: "URL no valida",
    checking: "Comprobando",
    online: "Conectado",
    offline: "Sin acceso",
  };
  connectionBadgeText.textContent = labels[state] || labels.empty;
}

function hasValidEndpoint() {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.includes("/macros/s/");
  } catch (error) {
    return false;
  }
}

function getGoogleActionButtons() {
  return [
    syncButton,
    statsButton,
    recentButton,
    lowStockButton,
    lowStockSearchButton,
    searchButton,
    submitButton,
    editSearchButton,
    saveEditButton,
    createSheetButton,
    addColumnsButton,
    deleteSheetButton,
    deleteColumnsButton,
    ...quickQueryButtons,
  ].filter(Boolean);
}

function beginGoogleAction(button, label) {
  if (isGoogleActionRunning) return false;
  isGoogleActionRunning = true;
  getGoogleActionButtons().forEach((item) => {
    if (item !== button) item.disabled = true;
  });
  setButtonLoading(button, true, label);
  return true;
}

function endGoogleAction(button) {
  setButtonLoading(button, false);
  getGoogleActionButtons().forEach((item) => {
    item.disabled = false;
  });
  isGoogleActionRunning = false;
  updateUploadState();
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === name);
  });
  const activeView = document.querySelector(`.view[data-view="${name}"]`);
  const statusSlot = activeView?.querySelector(".view-status-slot");
  if (statusSlot) {
    statusSlot.appendChild(statusStrip);
  } else {
    statusHost.appendChild(statusStrip);
  }
  if (name === "add" || name === "manage" || name === "edit") loadSheets();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function askConfirmation({ title, message }) {
  confirmTitle.textContent = title || "Confirmar accion";
  confirmMessage.textContent = message || "Estas seguro?";
  confirmDialog.showModal();
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirm(value) {
  if (confirmDialog.open) confirmDialog.close();
  if (confirmResolver) {
    confirmResolver(value);
    confirmResolver = null;
  }
}

function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.getAttribute("aria-label") || button.textContent;
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  if (button.classList.contains("icon-button")) {
    button.setAttribute("aria-label", button.id === "syncButton" ? "Sincronizar" : button.dataset.defaultLabel);
    return;
  }
  button.textContent = loading ? label : button.dataset.defaultText;
}

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  toast.hidden = false;
  toast.classList.remove("is-visible", "is-error", "is-warning");
  toastIcon.textContent = type === "error" ? "!" : type === "warning" ? "ST" : "OK";
  toastText.textContent = message;
  if (type === "error") toast.classList.add("is-error");
  if (type === "warning") toast.classList.add("is-warning");
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toast.classList.remove("is-visible", "is-error");
  }, 2900);
}
