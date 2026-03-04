// js/api.js
//!!! REEMPLAZA ESTA URL CON LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT!!!
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx2x94hWLVFr6KA1hQ--POHQjtix5WO7wKPJUwkBM3hw76W8MTFmVE_lKdEEih1dwCTNA/exec';

async function fetchDataFromAppsScript() {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getData`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al obtener datos de Apps Script:', error);
        throw error;
    }
}

async function fetchEspecialidadesFromAppsScript() {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getEspecialidades`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al obtener especialidades de Apps Script:', error);
        throw error;
    }
}

async function saveEditToAppsScript(data) {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=saveEdit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: data })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al guardar cambios en Apps Script:', error);
        throw error;
    }
}

async function deleteRowFromAppsScript(id) {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=deleteRow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al eliminar fila en Apps Script:', error);
        throw error;
    }
}