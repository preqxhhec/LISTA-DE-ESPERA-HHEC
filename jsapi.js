// js/api.js
// !!! REEMPLAZA ESTA URL CON LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT !!!
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyhit_aZN518HLmx4KAwQregMtC-OVx9Fz9PZohA13NAzPdjVBHSJ2mRfvD4T7HhGjFQQ/exec';

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
        // Convertimos el objeto data a URLSearchParams (formato clave=valor)
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(data)) {
            params.append(key, value || '');  // Evitamos undefined/null
        }

        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=saveEdit`, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
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
        const params = new URLSearchParams();
        params.append('id', id);

        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=deleteRow`, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
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
