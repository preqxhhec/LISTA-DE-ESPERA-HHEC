// js/app.js
let objectInfo = {}, table, refreshInterval;
let currentFechaFilter = '', currentEspecialidadFilter = '', currentEstatusTablaFilter = '', currentFolioVacioFilter = false, currentSearchFilter = '', currentPage = 0;

function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length!== 3) return dateStr;
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
}

$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    if (currentFechaFilter) {
        const normalizedFilter = normalizeDate(currentFechaFilter);
        const normalizedData = normalizeDate(data[3]);
        if (normalizedData!== normalizedFilter) return false;
    }
    const estatusFilter = document.getElementById('filter-estatusTabla').value;
    const estatusTabla = data[1] || '';
    const folioVacioFilter = document.getElementById('filter-folio-vacio').checked;
    const folio = data[31] || '';
    if (estatusFilter && estatusTabla!== estatusFilter) return false;
    if (folioVacioFilter && folio!== '') return false;
    return true;
});

function getFilterSummaryText() {
    const filters = [];
    const totalFiltered = table? table.rows({ search: 'applied', filter: 'applied' }).count() : 0;
    if (currentFechaFilter) filters.push(`Fecha: ${currentFechaFilter}`);
    if (currentEspecialidadFilter) filters.push(`Especialidad: ${currentEspecialidadFilter}`);
    if (currentEstatusTablaFilter) filters.push(`Estatus: ${currentEstatusTablaFilter}`);
    if (currentFolioVacioFilter) filters.push(`Solo sin folio`);
    if (currentSearchFilter) filters.push(`Búsqueda: "${currentSearchFilter}"`);
    return filters.length === 0? `${totalFiltered} registros encontrados` : `Filtros aplicados: ${filters.join(' | ')}\n${totalFiltered} registros encontrados`;
}

function updateFilterSummary() {
    const summaryDiv = document.getElementById('filter-summary');
    const filters = [];
    const totalFiltered = table? table.rows({ search: 'applied', filter: 'applied' }).count() : 0;
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
        await loadTable(objectInfo); // Cargar tabla y también las especialidades
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
        if (JSON.stringify(newData)!== JSON.stringify(objectInfo)) {
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
        // Manejar el error, quizás mostrando un mensaje o un fallback
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
            { target: 28, render: (data) => `<span class="${data === 'P1'? 'text-danger' : data === 'P2'? 'text-warning' : 'text-success'}">${data}</span>` },
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
        lengthMenu: [10, 20, 25, 30],
        columns: formattedCols,
        initComplete: function () {
            $("#filter-fecha").datepicker({
                dateFormat: "dd/mm/yy",
                regional: "es",
                changeMonth: true,
                changeYear: true,
                onSelect: (dateText) => { currentFechaFilter = dateText; table.draw(); updateFilterSummary(); }
            }).on('change', function () {
                if (!this.value) { currentFechaFilter = ''; table.draw(); updateFilterSummary(); }
            });
            $.datepicker.setDefaults($.datepicker.regional['es']);

            setTimeout(() => {
                const filterDiv = this.api().table().container().querySelector('div.dataTables_filter');
                const controlsContainer = document.getElementById('controls-container');
                const existingFilter = controlsContainer.querySelector('div.dataTables_filter');
                if (existingFilter) existingFilter.remove();
                if (filterDiv) {
                    filterDiv.querySelector('label').childNodes[0].nodeValue = 'Buscar ';
                    controlsContainer.appendChild(filterDiv);
                    const searchInput = document.querySelector('div.dataTables_filter input');
                    searchInput.addEventListener('keyup', function () {
                        currentSearchFilter = this.value;
                        updateFilterSummary();
                    });
                    if (currentSearchFilter) {
                        searchInput.value = currentSearchFilter;
                        this.api().search(currentSearchFilter).draw();
                    }
                }
            }, 0);

            document.getElementById('filter-especialidad').addEventListener('change', function () {
                currentEspecialidadFilter = this.value;
                table.column(14).search(currentEspecialidadFilter).draw();
                updateFilterSummary();
            });
            document.getElementById('filter-estatusTabla').addEventListener('change', function () {
                currentEstatusTablaFilter = this.value;
                table.draw();
                updateFilterSummary();
            });
            document.getElementById('filter-folio-vacio').addEventListener('change', function () {
                currentFolioVacioFilter = this.checked;
                table.draw();
                updateFilterSummary();
            });

            document.getElementById('filter-fecha').value = currentFechaFilter;
            document.getElementById('filter-especialidad').value = currentEspecialidadFilter;
            document.getElementById('filter-estatusTabla').value = currentEstatusTablaFilter;
            document.getElementById('filter-folio-vacio').checked = currentFolioVacioFilter;

            table.clear().rows.add(object.usersInfo || []).draw();

            if (currentSearchFilter) table.search(currentSearchFilter);
            if (currentEspecialidadFilter) table.column(14).search(currentEspecialidadFilter);
            if (currentFechaFilter || currentEstatusTablaFilter || currentFolioVacioFilter) table.draw();

            const totalPages = table.page.info().pages;
            const validPage = Math.min(page, totalPages - 1);
            if (validPage >= 0) table.page(validPage).draw('page');

            updateFilterSummary();
            table.on('draw', updateFilterSummary);
        }
    });

    // === EVENTOS: EDITAR, IMPRIMIR, ELIMINAR ===
    $('#usersTable tbody').off('click').on('click', '.edit-btn,.print-btn,.delete-btn', function (e) {
        e.stopPropagation();
        const $tr = $(this).closest('tr');
        let row;

        if ($tr.hasClass('child')) {
            row = table.row($tr.prev('tr.parent'));
        } else {
            row = table.row($tr);
        }

        const data = row.data();
        if (!data) return;

        if ($(this).hasClass('edit-btn')) {
            showEditModal(data);
        } else if ($(this).hasClass('print-btn')) {
            printPatient(data);
        } else if ($(this).hasClass('delete-btn')) {
            const confirmDelete = confirm(
                `ELIMINAR PACIENTE PERMANENTEMENTE\n\n` +
                `Nombre: ${data[4]}\n` +
                `RUT: ${data[5]}\n` +
                `ID: ${data[0]}\n\n` +
                `¿Estás completamente seguro?\nEsta acción NO se puede deshacer.`
            );
            if (confirmDelete) {
                showDeletePasswordModal(data);
            }
        }
    });

    // === IMPRIMIR FICHA ===
    function printPatient(data) {
        const printDate = new Date().toLocaleString('es-CL');
        const summaryText = getFilterSummaryText();

        const printWindow = window.open('', '', 'width=900,height=700');
        const htmlContent = ` <!DOCTYPE html> <html> <head> <meta charset="utf-8"> <title>Ficha Paciente - ${data[4] || 'Sin nombre'}</title> <style> body { font-family: Arial, sans-serif; margin: 30px; line-height: 1.6; }.header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 15px; margin-bottom: 20px; }.header h1 { color: #007bff; margin: 0; font-size: 26pt; }.info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }.info div { background: #f8f9fa; padding: 12px; border-radius: 6px; }.info strong { color: #007bff; }.footer { margin-top: 30px; text-align: center; font-size: 10pt; color: #6c757d; } @media print { body { margin: 15mm; } } </style> </head> <body> <div class="header"> <h1>HOSPITAL DE ILLAPEL</h1> <p><strong>FICHA DE PACIENTE - LISTA DE ESPERA</strong></p> <p>Impreso: ${printDate}</p>
    <p><strong>${summaryText}</strong></p> </div> <div class="info"> <div><strong>ID:</strong> ${data[0] || ''}</div> <div><strong>Estatus:</strong> <span style="color:${data[1] === 'PROGRAMABLE'? 'green' : data[1] === 'PENDIENTE EPA'? 'orange' : 'red'}">${data[1] || ''}</span></div> <div><strong>Nombre:</strong> ${data[4] || ''}</div> <div><strong>RUT:</strong> ${data[5] || ''}</div> <div><strong>Edad:</strong> ${data[7] || ''}</div> <div><strong>Comuna:</strong> ${data[10] || ''}</div> <div><strong>Especialidad:</strong> ${data[14] || ''}</div> <div><strong>Médico:</strong> ${data[15] || ''}</div> <div><strong>Diagnóstico:</strong> ${data[16] || ''}</div> <div><strong>Intervención:</strong> ${data[18] || ''}</div> <div><strong>Prioridad:</strong> <span style="color:${data[28] === 'P1'? 'red' : data[28] === 'P2'? 'orange' : 'green'}">${data[28] || ''}</span></div> <div><strong>Folio:</strong> ${data[31] || 'Sin folio'}</div> </div> <div style="margin-top:20px;"> <p><strong>Observaciones:</strong><br>${(data[29] || '').replace(/\n/g, '<br>') || 'Sin observaciones'}</p> <p><strong>Indicaciones Anestesiólogo:</strong><br>${(data[30] || '').replace(/\n/g, '<br>') || 'Sin indicaciones'}</p> </div> <div class="footer"> Generado desde Lista de Espera Integral Hospital de Illapel | ${new Date().toLocaleDateString('es-CL')} </div> </body> </html>`;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = function () {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => printWindow.close(), 500);
        };
    }

    // === MODAL EDITAR ===
    function showEditModal(data) {
        const editModal = document.getElementById('editModal');
        const editForm = document.getElementById('edit-form');
        const estatusTablaOptions = ['PROGRAMABLE', 'PENDIENTE EPA', 'NO PROGRAMABLE', 'ACTUALIZAR', 'CARTA CERTIFICADA', 'OPERADO', 'EGRESO', 'TRASLADO INTERNO', 'RECHAZO', 'EXCEPTUADO', 'BOX'];
        const editEstatusTablaSelect = document.getElementById('edit-estatusTabla');
        editEstatusTablaSelect.innerHTML = '<option value=""></option>';
        estatusTablaOptions.forEach(estatus => {
            const option = document.createElement('option');
            option.value = estatus;
            option.textContent = estatus;
            editEstatusTablaSelect.appendChild(option);
        });

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
            // Si la contraseña es vacía, asumimos que no se requiere. Adapta esto según tu lógica de seguridad.
            // En tu código original, un password vacío en el modal de edición simplemente procedía.
            // Para la eliminación, se requería 'Pqx1234'. Aquí mantengo la lógica de tu código original.
            if (enteredPassword === '') {
                passwordModal.hide();
                proceedWithSave();
            } else { // Si se ingresó algo, pero no es la correcta para eliminar (que no es este caso), sería un error.
                // Como este botón es para guardar, y el original permitía vacío,
                // si se ingresa algo aquí, simplemente lo ignoramos si no es para validación estricta de guardado.
                // Si quieres exigir contraseña para guardar, aquí va la verificación.
                // Por ahora, sigo la lógica de tu script original donde el modal de contraseña para 'guardar'
                // solo se muestra si el input de contraseña para 'guardar' NO está vacío,
                // y si está vacío, procede sin validación de contraseña.
                // Si realmente quieres una contraseña para guardar, deberías validarla aquí.
                // Por simplicidad, si el campo no está vacío, lo marco como inválido,
                // ya que la lógica original solo permitía vacío para guardar.
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
                // rowIndex: editForm.dataset.rowIndex, // Ya no se usa directamente en el backend con la API
                id: document.getElementById('edit-id').value,
                estatusTabla: document.getElementById('edit-estatusTabla').value,
                tEspera: document.getElementById('edit-tEspera').value, // Aunque disabled, si lo capturas aquí, se enviará
                fechaIndQx: document.getElementById('edit-fechaIndQx').value,
                nombreYApellido: document.getElementById('edit-nombreYApellido').value,
                rut: document.getElementById('edit-rut').value,
                fechaNac: document.getElementById('edit-fechaNac').value,
                edad: document.getElementById('edit-edad').value, // Aunque disabled
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
                esperaProgram: document.getElementById('edit-esperaProgram').value, // Aunque disabled
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
            const response = await deleteRowFromAppsScript(data[0]); // data[0] es el ID
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
}
// === CORREGIR ARIA-HIDDEN EN MODAL DE CONTRASEÑA ===
const passwordModalEl = document.getElementById('passwordModal');

passwordModalEl.addEventListener('shown.bs.modal', function () {
    // Cuando el modal se muestra: quitar aria-hidden
    passwordModalEl.setAttribute('aria-hidden', 'false');

    // Opcional: enfocar el input de contraseña
    document.getElementById('password-input').focus();
});

passwordModalEl.addEventListener('hidden.bs.modal', function () {
    // Cuando se cierra: restaurar aria-hidden
    passwordModalEl.setAttribute('aria-hidden', 'true');
});