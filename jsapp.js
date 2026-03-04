
// js/app.js
let objectInfo = {}, table, refreshInterval;
let currentFechaFilter = '', currentEspecialidadFilter = '', currentEstatusTablaFilter = '', currentFolioVacioFilter = false, currentSearchFilter = '', currentPage = 0;

function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
}

$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    if (currentFechaFilter) {
        const normalizedFilter = normalizeDate(currentFechaFilter);
        const normalizedData = normalizeDate(data[3]);
        if (normalizedData !== normalizedFilter) return false;
    }
    const estatusFilter = document.getElementById('filter-estatusTabla').value;
    const estatusTabla = data[1] || '';
    const folioVacioFilter = document.getElementById('filter-folio-vacio').checked;
    const folio = data[31] || '';
    if (estatusFilter && estatusTabla !== estatusFilter) return false;
    if (folioVacioFilter && folio !== '') return false;
    return true;
});

function getFilterSummaryText() {
    const filters = [];
    const totalFiltered = table ? table.rows({ search: 'applied', filter: 'applied' }).count() : 0;
    if (currentFechaFilter) filters.push(`Fecha: ${currentFechaFilter}`);
    if (currentEspecialidadFilter) filters.push(`Especialidad: ${currentEspecialidadFilter}`);
    if (currentEstatusTablaFilter) filters.push(`Estatus: ${currentEstatusTablaFilter}`);
    if (currentFolioVacioFilter) filters.push(`Solo sin folio`);
    if (currentSearchFilter) filters.push(`Búsqueda: "${currentSearchFilter}"`);
    return filters.length === 0 ? `${totalFiltered} registros encontrados` : `Filtros aplicados: ${filters.join(' | ')}\n${totalFiltered} registros encontrados`;
}

function updateFilterSummary() {
    const summaryDiv = document.getElementById('filter-summary');
    const filters = [];
    const totalFiltered = table ? table.rows({ search: 'applied', filter: 'applied' }).count() : 0;
    if (currentFechaFilter) filters.push(`<span class="badge bg-primary">Fecha: ${currentFechaFilter}</span>`);
    if (currentEspecialidadFilter) filters.push(`<span class="badge bg-info">Especialidad: ${currentEspecialidadFilter}</span>`);
    if (currentEstatusTablaFilter) filters.push(`<span class="badge bg-success">Estatus: ${currentEstatusTablaFilter}</span>`);
    if (currentFolioVacioFilter) filters.push(`<span class="badge bg-warning">Solo sin folio</span>`);
    if (currentSearchFilter) filters.push(`<span class="badge bg-secondary">Búsqueda: "${currentSearchFilter}"</span>`);
    summaryDiv.innerHTML = filters.length === 0
        ? `<strong>${totalFiltered} registros encontrados</strong>`
        : `<div><strong>Filtros aplicados:</strong> ${filters.join(' ')}</div><div class="mt-1"><strong>${totalFiltered} registros encontrados</strong></div>`;
}

window.addEventListener("load", async () => {
    try {
        objectInfo = await fetchDataFromAppsScript();
        await loadTable(objectInfo);
        startPolling();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        alert('Error al cargar los datos iniciales');
    }
});

function startPolling() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshData, 300000); // 5 minutos
}

async function refreshData() {
    try {
        const newData = await fetchDataFromAppsScript();
        if (JSON.stringify(newData) !== JSON.stringify(objectInfo)) {
            objectInfo = newData;
            loadTable(objectInfo, currentPage);
        }
    } catch (error) {
        console.error('Error al actualizar datos:', error);
    }
}

async function loadTable(object, page = 0) {
    const formattedCols = object.headers.map(header => ({ 'title': header }));

    if ($.fn.dataTable.isDataTable('#usersTable')) {
        currentFechaFilter = document.getElementById('filter-fecha').value;
        currentEspecialidadFilter = document.getElementById('filter-especialidad').value;
        currentEstatusTablaFilter = document.getElementById('filter-estatusTabla').value;
        currentFolioVacioFilter = document.getElementById('filter-folio-vacio').checked;
        currentSearchFilter = document.querySelector('div.dataTables_filter input')?.value || '';
        currentPage = table.page();
        table.destroy();
    }

    // Cargar especialidades dinámicamente para el filtro superior
    try {
        const especialidadesData = await fetchEspecialidadesFromAppsScript();
        const especialidades = especialidadesData.especialidades;
        const especialidadSelect = document.getElementById('filter-especialidad');
        especialidadSelect.innerHTML = '<option value="">Todas</option>';
        especialidades.forEach(especialidad => {
            const option = document.createElement('option');
            option.value = especialidad;
            option.textContent = especialidad;
            especialidadSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar especialidades:', error);
    }

    const estatusTablaOptions = ['PROGRAMABLE', 'PENDIENTE EPA', 'NO PROGRAMABLE', 'ACTUALIZAR', 'CARTA CERTIFICADA', 'OPERADO', 'EGRESO', 'TRASLADO INTERNO', 'RECHAZO', 'EXCEPTUADO', 'BOX'];
    const estatusTablaSelect = document.getElementById('filter-estatusTabla');
    estatusTablaSelect.innerHTML = '<option value="">Todos</option>';
    estatusTablaOptions.forEach(estatus => {
        const option = document.createElement('option');
        option.value = estatus;
        option.textContent = estatus;
        estatusTablaSelect.appendChild(option);
    });

    table = new DataTable("#usersTable", {
        autoWidth: true,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.13.5/i18n/es-MX.json" },
        responsive: { details: { type: 'column', target: 'tr' } },
        dom: 'Bfrtip',
        buttons: {
            dom: { button: { tag: 'button', className: '' } },
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="bi bi-file-earmark-spreadsheet"></i>',
                    titleAttr: 'Exportar a Excel',
                    className: 'btn btn-success btn-sm'
                },
                {
                    extend: 'pdfHtml5',
                    text: '<i class="bi bi-file-earmark-pdf"></i>',
                    titleAttr: 'Exportar a PDF',
                    className: 'btn btn-danger btn-sm',
                    orientation: 'landscape',
                    pageSize: 'A4',
                    title: '',
                    exportOptions: { columns: [0, 1, 4, 5, 16, 2, 33], modifier: { search: 'applied', order: 'applied', page: 'all' } },
                    customize: function (doc) {
                        const summaryText = getFilterSummaryText();
                        const printDate = new Date().toLocaleString('es-CL');
                        doc.defaultStyle = { font: 'Roboto', fontSize: 10 };
                        doc.content = [
                            {
                                columns: [{
                                    width: 'auto',
                                    text: [
                                        { text: 'HOSPITAL DE ILLAPEL\n', fontSize: 16, bold: true, color: '#007bff' },
                                        { text: 'LISTA DE ESPERA INTEGRAL\n', fontSize: 14, bold: true },
                                        { text: `Impreso: ${printDate}\n\n`, fontSize: 10 },
                                        { text: summaryText, fontSize: 12, bold: true }
                                    ],
                                    alignment: 'center'
                                }],
                                margin: [0, 0, 0, 15]
                            },
                            ...doc.content
                        ];
                        doc.styles.tableHeader = { bold: true, fontSize: 10, color: 'white', fillColor: '#007bff' };
                    }
                },
                {
                    extend: 'print',
                    text: '<i class="bi bi-printer"></i>',
                    titleAttr: 'Imprimir lista',
                    className: 'btn btn-info btn-sm',
                    autoPrint: true,
                    exportOptions: { columns: [0, 1, 4, 5, 16, 2, 33], modifier: { search: 'applied', order: 'applied', page: 'all' } },
                    customize: function (win) {
                        const summaryText = getFilterSummaryText();
                        const printDate = new Date().toLocaleString('es-CL');
                        $(win.document.body).css({
                            'font-family': 'Arial, sans-serif',
                            'font-size': '10pt',
                            'line-height': '1.5',
                            'margin': '20px'
                        });
                        $(win.document.body).prepend(`
                        <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #007bff; padding-bottom:10px;">
                            <h1 style="color:#007bff; font-size:24pt; margin:0;">HOSPITAL DE ILLAPEL</h1>
                            <p style="font-size:18pt; margin:5px 0;"><strong>LISTA DE ESPERA INTEGRAL</strong></p>
                            <p style="font-size:12pt; margin:5px 0;">Impreso: ${printDate}</p>
                            <p style="font-size:14pt; margin-top:10px; font-weight:bold;">${summaryText}</p>
                        </div>
                        `);
                        $(win.document.body).find('table').css({
                            'width': '100%',
                            'border-collapse': 'collapse',
                            'margin-top': '10px',
                            'font-size': '10pt'
                        });
                        $(win.document.body).find('th').css({
                            'background-color': '#007bff',
                            'color': 'white',
                            'padding': '8px',
                            'text-align': 'left',
                            'font-weight': 'bold'
                        });
                        $(win.document.body).find('td').css({
                            'padding': '8px',
                            'border-bottom': '1px solid #eee',
                            'vertical-align': 'top'
                        });
                    }
                },
                {
                    extend: 'colvis',
                    text: '<i class="bi bi-table"></i>',
                    titleAttr: 'Mostrar/Ocultar columnas',
                    className: 'btn btn-secondary btn-sm'
                }
            ]
        },
        order: [[0, 'desc']],
        columnDefs: [
            { responsivePriority: 2, targets: 14 },
            { responsivePriority: 1, targets: 0 },
            { responsivePriority: 3, targets: [1, 2, 3, 4, 5, 6, 7] },
            {
                target: 1, render: (data) => {
                    const colors = { PROGRAMABLE: 'text-success', 'PENDIENTE EPA': 'text-warning', 'NO PROGRAMABLE': 'text-danger', ACTUALIZAR: 'text-muted', 'CARTA CERTIFICADA': 'text-light bg-dark' };
                    return `<span class="${colors[data] || 'text-dark'}">${data}</span>`;
                }
            },
            { target: 5, className: 'rut' },
            { target: 28, render: (data) => `<span class="${data === 'P1' ? 'text-danger' : data === 'P2' ? 'text-warning' : 'text-success'}">${data}</span>` },
            { target: 29, className: 'observaciones' },
            { target: 30, className: 'observaciones' },
            { targets: 4, createdCell: function (td) { $(td).css({ 'white-space': 'nowrap', 'overflow': 'visible' }); } },
            { targets: 14, createdCell: function (td) { $(td).css({ 'white-space': 'nowrap', 'overflow': 'visible' }); } },
            {
                targets: 36,
                render: (data, type, row) =>
                    `<div class="btn-group" role="group">
                    <button class="btn btn-primary btn-sm edit-btn" title="Editar paciente">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-success btn-sm print-btn" title="Imprimir ficha">
                        <i class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" title="Eliminar permanentemente">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`
            }
        ],
        lengthMenu: [10, 20, 25, 50, 100],
        pageLength: 25,
        data: object.usersInfo,
        columns: formattedCols
    });

    // Listener para botones de acción en cada fila
    document.querySelector('#usersTable tbody').addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const row = table.row(btn.closest('tr'));
        const data = row.data();

        if (btn.classList.contains('edit-btn')) {
            showEditModal(data);
        } else if (btn.classList.contains('print-btn')) {
            // Lógica para imprimir ficha individual (puedes implementar aquí o usar el botón de print general)
            alert('Función de impresión de ficha individual aún no implementada.');
        } else if (btn.classList.contains('delete-btn')) {
            showDeletePasswordModal(data);
        }
    });

    // Actualizar resumen de filtros después de cargar
    updateFilterSummary();
    table.on('draw', updateFilterSummary);
}

// === MOSTRAR MODAL DE EDICIÓN ===
function showEditModal(data) {
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('edit-form');
    const editEstatusTablaSelect = document.getElementById('edit-estatusTabla');

    // Limpiar y cargar opciones de estatus
    editEstatusTablaSelect.innerHTML = '<option value="">Seleccione</option>';
    const estatusTablaOptions = ['PROGRAMABLE', 'PENDIENTE EPA', 'NO PROGRAMABLE', 'ACTUALIZAR', 'CARTA CERTIFICADA', 'OPERADO', 'EGRESO', 'TRASLADO INTERNO', 'RECHAZO', 'EXCEPTUADO', 'BOX'];
    estatusTablaOptions.forEach(estatus => {
        const option = document.createElement('option');
        option.value = estatus;
        option.textContent = estatus;
        editEstatusTablaSelect.appendChild(option);
    });

    // Llenar campos del modal
    document.getElementById('edit-id').value = data[0] || '';
    document.getElementById('edit-estatusTabla').value = data[1] || '';
    document.getElementById('edit-tEspera').value = data[2] || '';
    document.getElementById('edit-fechaIndQx').value = data[3] || '';
    document.getElementById('edit-nombreYApellido').value = data[4] || '';
    document.getElementById('edit-rut').value = data[5] || '';
    document.getElementById('edit-fechaNac').value = data[6] || '';
    document.getElementById('edit-edad').value = data[7] || '';
    document.getElementById('edit-patologiasCronicas').value = data[8] || '';
    document.getElementById('edit-medicamentosCronicos').value = data[9] || '';
    document.getElementById('edit-comuna').value = data[10] || '';
    document.getElementById('edit-direccion').value = data[11] || '';
    document.getElementById('edit-nContacto').value = data[12] || '';
    document.getElementById('edit-email').value = data[13] || '';
    document.getElementById('edit-especialidad').value = data[14] || '';
    document.getElementById('edit-medicoTratante').value = data[15] || '';
    document.getElementById('edit-diagnostico').value = data[16] || '';
    document.getElementById('edit-lateralidad').value = data[17] || '';
    document.getElementById('edit-intervencion').value = data[18] || '';
    document.getElementById('edit-estatusEpa').value = data[19] || '';
    document.getElementById('edit-anestesiologo').value = data[20] || '';
    document.getElementById('edit-fechaEpa').value = data[21] || '';
    document.getElementById('edit-ges').value = data[22] || '';
    document.getElementById('edit-taco').value = data[23] || '';
    document.getElementById('edit-asa').value = data[24] || '';
    document.getElementById('edit-ekg').value = data[25] || '';
    document.getElementById('edit-rx').value = data[26] || '';
    document.getElementById('edit-eco').value = data[27] || '';
    document.getElementById('edit-prioridad').value = data[28] || '';
    document.getElementById('edit-observaciones').value = data[29] || '';
    document.getElementById('edit-indicacionesAnestesiologo').value = data[30] || '';
    document.getElementById('edit-folio').value = data[31] || '';
    document.getElementById('edit-fechaEstatusProgram').value = data[32] || '';
    document.getElementById('edit-esperaProgram').value = data[33] || '';
    document.getElementById('edit-fechaCirugia').value = data[34] || '';
    document.getElementById('edit-registro').value = data[35] || '';

    editForm.dataset.rowIndex = data[36];

    const modal = new bootstrap.Modal(editModal);
    modal.show();
}

// === GUARDAR EDICIÓN ===
document.getElementById('save-edit-btn').addEventListener('click', () => {
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('edit-form');

    const requiredFields = [
        'edit-id', 'edit-estatusTabla', 'edit-fechaIndQx', 'edit-nombreYApellido',
        'edit-rut', 'edit-fechaNac', 'edit-comuna', 'edit-especialidad',
        'edit-medicoTratante', 'edit-diagnostico', 'edit-intervencion'
    ];
    let isValid = true;
    requiredFields.forEach(id => {
        const field = document.getElementById(id);
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');
        } else {
            field.classList.remove('is-invalid');
        }
    });
    if (!isValid) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    const editModalInstance = bootstrap.Modal.getInstance(editModal);
    editModalInstance.hide();

    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');
    const confirmBtn = document.getElementById('confirm-password-btn');

    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordInput.classList.remove('is-invalid');
    passwordModal.show();

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', function handleConfirm() {
        const enteredPassword = passwordInput.value.trim();
        if (enteredPassword === '') {
            passwordModal.hide();
            proceedWithSave();
        } else {
            passwordInput.classList.add('is-invalid');
            passwordError.style.display = 'block';
        }
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            newConfirmBtn.click();
        }
    });

    async function proceedWithSave() {
        const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        loadingModal.show();

        const dataToSave = {
            id: document.getElementById('edit-id').value,
            estatusTabla: document.getElementById('edit-estatusTabla').value,
            tEspera: document.getElementById('edit-tEspera').value,
            fechaIndQx: document.getElementById('edit-fechaIndQx').value,
            nombreYApellido: document.getElementById('edit-nombreYApellido').value,
            rut: document.getElementById('edit-rut').value,
            fechaNac: document.getElementById('edit-fechaNac').value,
            edad: document.getElementById('edit-edad').value,
            patologiasCronicas: document.getElementById('edit-patologiasCronicas').value,
            medicamentosCronicos: document.getElementById('edit-medicamentosCronicos').value,
            comuna: document.getElementById('edit-comuna').value,
            direccion: document.getElementById('edit-direccion').value,
            nContacto: document.getElementById('edit-nContacto').value,
            email: document.getElementById('edit-email').value,
            especialidad: document.getElementById('edit-especialidad').value,
            medicoTratante: document.getElementById('edit-medicoTratante').value,
            diagnostico: document.getElementById('edit-diagnostico').value,
            lateralidad: document.getElementById('edit-lateralidad').value,
            intervencion: document.getElementById('edit-intervencion').value,
            estatusEpa: document.getElementById('edit-estatusEpa').value,
            anestesiologo: document.getElementById('edit-anestesiologo').value,
            fechaEpa: document.getElementById('edit-fechaEpa').value,
            ges: document.getElementById('edit-ges').value,
            taco: document.getElementById('edit-taco').value,
            asa: document.getElementById('edit-asa').value,
            ekg: document.getElementById('edit-ekg').value,
            rx: document.getElementById('edit-rx').value,
            eco: document.getElementById('edit-eco').value,
            prioridad: document.getElementById('edit-prioridad').value,
            observaciones: document.getElementById('edit-observaciones').value,
            indicacionesAnestesiologo: document.getElementById('edit-indicacionesAnestesiologo').value,
            folio: document.getElementById('edit-folio').value,
            fechaEstatusProgram: document.getElementById('edit-fechaEstatusProgram').value,
            esperaProgram: document.getElementById('edit-esperaProgram').value,
            fechaCirugia: document.getElementById('edit-fechaCirugia').value,
            registro: document.getElementById('edit-registro').value
        };

        try {
            const response = await saveEditToAppsScript(dataToSave);
            loadingModal.hide();
            if (response && response.success) {
                alert('Cambios guardados exitosamente!');
                refreshData();
            } else {
                alert('Error al guardar: ' + (response?.error || 'Desconocido'));
            }
        } catch (error) {
            loadingModal.hide();
            alert('Error de conexión: ' + error.message);
        }
    }
});

// === ELIMINAR PERMANENTEMENTE ===
function showDeletePasswordModal(data) {
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');
    const modalTitle = document.getElementById('passwordModalLabel');
    const confirmBtn = document.getElementById('confirm-password-btn');

    modalTitle.textContent = "ELIMINAR PACIENTE - CONFIRMACIÓN";
    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordInput.classList.remove('is-invalid');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async function handleConfirm() {
        if (passwordInput.value.trim() === 'Pqx1234') {
            passwordModal.hide();
            await proceedWithDelete(data);
        } else {
            passwordInput.classList.add('is-invalid');
            passwordError.style.display = 'block';
        }
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            newConfirmBtn.click();
        }
    });

    passwordModal.show();
}

async function proceedWithDelete(data) {
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadingModal.show();

    try {
        const response = await deleteRowFromAppsScript(data[0]);
        loadingModal.hide();
        if (response && response.success) {
            alert('Paciente eliminado permanentemente.');
            refreshData();
        } else {
            alert('Error al eliminar: ' + (response?.error || 'Desconocido'));
        }
    } catch (error) {
        loadingModal.hide();
        alert('Error de conexión: ' + error.message);
    }
}

// FIX ACCESIBILIDAD - versión más fuerte
document.querySelectorAll('.modal').forEach(modalEl => {
    modalEl.addEventListener('hide.bs.modal', function (event) {
        // 1. Quitar foco inmediato del elemento activo si está dentro
        const active = document.activeElement;
        if (active && modalEl.contains(active)) {
            active.blur();
        }

        // 2. Forzar blur en elementos específicos (botones problemáticos)
        const saveBtn = document.getElementById('save-edit-btn');
        const confirmBtn = document.getElementById('confirm-password-btn');
        if (saveBtn) saveBtn.blur();
        if (confirmBtn) confirmBtn.blur();

        // 3. Mover foco a body o al trigger (evita que quede "flotando")
        document.body.focus();  // o al botón que abrió el modal si lo tienes
    });

    // Opcional: al mostrar, enfocar primer input
    modalEl.addEventListener('shown.bs.modal', function () {
        const firstInput = modalEl.querySelector('input, select, textarea, button');
        if (firstInput) firstInput.focus();
    });
});

