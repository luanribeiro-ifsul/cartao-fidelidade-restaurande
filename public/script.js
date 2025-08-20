document.addEventListener('DOMContentLoaded', () => {
    const nomeInput = document.getElementById('nome');
    const telefoneInput = document.getElementById('telefone');
    const emailInput = document.getElementById('email');
    const btnCadastrar = document.getElementById('btn-cadastrar');
    const btnLimparCampos = document.getElementById('btn-limpar-campos');

    const clienteNomeInput = document.getElementById('cliente-nome');
    const btnBuscarNome = document.getElementById('btn-buscar-nome');
    const btnNovaBusca = document.getElementById('btn-nova-busca');
    const statusClienteDiv = document.getElementById('status-cliente');
    const btnRegistrar = document.getElementById('btn-registrar');
    const btnResgatar = document.getElementById('btn-resgatar');
    const btnEditar = document.getElementById('btn-editar');
    const btnExcluir = document.getElementById('btn-excluir');
    const btnMostrarTodos = document.getElementById('btn-mostrar-todos');

    const logSistemaDiv = document.getElementById('log-sistema');
    const btnMostrarMais = document.getElementById('btn-mostrar-mais');

    const modalBuscaNome = document.getElementById('modal-busca-nome');
    const resultadosBuscaDiv = document.getElementById('resultados-busca');
    const closeButtonBusca = modalBuscaNome.querySelector('.close-button');

    const modalEdicao = document.getElementById('modal-edicao');
    const formEdicao = document.getElementById('form-edicao');
    const editNomeInput = document.getElementById('edit-nome');
    const editTelefoneInput = document.getElementById('edit-telefone');
    const editEmailInput = document.getElementById('edit-email');
    const closeButtonEdicao = modalEdicao.querySelector('.close-button-edicao');
    
    const modalTodosClientes = document.getElementById('modal-todos-clientes');
    const todosClientesLista = document.getElementById('todos-clientes-lista');
    const closeButtonTodos = modalTodosClientes.querySelector('.close-button-todos');

    let clienteAtual = null;
    let todosOsLogs = [];
    let logsVisiveis = 0;
    const NUMERO_LOGS_POR_PAGINA = 20;

    function log(mensagem, tipo = 'info') {
        const dataHora = new Date().toLocaleString('pt-BR');
        const logItem = { mensagem: `[${dataHora}] - ${mensagem}`, tipo };
        todosOsLogs.unshift(logItem);
        renderizarLogs();
    }

    function renderizarLogs() {
        logSistemaDiv.innerHTML = '';
        logsVisiveis = Math.min(todosOsLogs.length, logsVisiveis === 0 ? NUMERO_LOGS_POR_PAGINA : logsVisiveis);
        
        for (let i = 0; i < logsVisiveis; i++) {
            const logItem = todosOsLogs[i];
            const logElement = document.createElement('div');
            logElement.className = `feedback ${logItem.tipo}`;
            logElement.innerHTML = logItem.mensagem;
            logSistemaDiv.appendChild(logElement);
        }

        if (todosOsLogs.length > logsVisiveis) {
            btnMostrarMais.style.display = 'block';
        } else {
            btnMostrarMais.style.display = 'none';
        }
    }

    btnMostrarMais.addEventListener('click', () => {
        logsVisiveis += NUMERO_LOGS_POR_PAGINA;
        renderizarLogs();
    });

    function renderizarTabelaClientes(container, clientes, fecharModal) {
        if (clientes.length === 0) {
            container.innerHTML = '<p>Nenhum cliente encontrado.</p>';
            return;
        }

        const tabela = document.createElement('table');
        tabela.className = 'tabela-clientes';
        tabela.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Almoços</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = tabela.querySelector('tbody');

        clientes.forEach(c => {
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${c.id}</td>
                <td>${c.nome}</td>
                <td>${c.telefone}</td>
                <td>${c.almoços_acumulados}</td>
            `;
            linha.addEventListener('click', () => {
                exibirDadosCliente(c);
                fecharModal(); // Fecha o modal após selecionar o cliente
                log(`Cliente **${c.nome}** (ID: ${c.id}) selecionado.`, 'sucesso');
            });
            tbody.appendChild(linha);
        });

        container.innerHTML = '';
        container.appendChild(tabela);
    }

    function resetarStatusCliente() {
        statusClienteDiv.className = 'feedback info';
        statusClienteDiv.innerHTML = 'Aguardando busca...';
        btnRegistrar.disabled = true;
        btnResgatar.disabled = true;
        btnEditar.disabled = true;
        btnExcluir.disabled = true;
    }
    
    function resetarCamposCadastro() {
        nomeInput.value = '';
        telefoneInput.value = '';
        emailInput.value = '';
    }

    function resetarBusca() {
        clienteNomeInput.value = '';
        resetarStatusCliente();
        clienteAtual = null;
    }

    btnLimparCampos.addEventListener('click', resetarCamposCadastro);

    btnCadastrar.addEventListener('click', async () => {
        const nome = nomeInput.value.trim();
        const telefone = telefoneInput.value.trim();
        const email = emailInput.value.trim();

        if (!nome || !telefone) {
            log('Nome e telefone são obrigatórios.', 'erro');
            return;
        }

        try {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, telefone, email })
            });
            const data = await response.json();
            if (response.ok) {
                log(data.mensagem, 'sucesso');
                resetarCamposCadastro();
            } else {
                log(`Erro: ${data.error}`, 'erro');
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });
    
    async function buscarCliente(id) {
        try {
            const response = await fetch(`/api/clientes/${id}`);
            const data = await response.json();
            if (response.ok) {
                exibirDadosCliente(data);
            } else {
                log(`Erro: ${data.error}`, 'erro');
                resetarStatusCliente();
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
            resetarStatusCliente();
        }
    }
    
    btnBuscarNome.addEventListener('click', async () => {
        const nome = clienteNomeInput.value.trim();
        if (!nome) {
            log('Nome do cliente é obrigatório para a busca.', 'erro');
            return;
        }
        try {
            const response = await fetch(`/api/clientes/buscar-nome/${nome}`);
            const clientes = await response.json();
            if (response.ok) {
                renderizarTabelaClientes(resultadosBuscaDiv, clientes, () => modalBuscaNome.style.display = 'none');
                modalBuscaNome.style.display = 'block';
            } else {
                log(`Erro na busca: ${clientes.error}`, 'erro');
                resultadosBuscaDiv.innerHTML = `<span class="erro">${clientes.error}</span>`;
                modalBuscaNome.style.display = 'block';
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });

    btnNovaBusca.addEventListener('click', resetarBusca);

    function exibirDadosCliente(cliente) {
        clienteAtual = cliente;
        let dataInicioFormatada = 'N/A';
        let dataExpiraFormatada = 'N/A';
        if (cliente.data_inicio_acm) {
            const dataInicioObj = new Date(cliente.data_inicio_acm);
            const dataExpiraObj = new Date(dataInicioObj);
            dataExpiraObj.setDate(dataExpiraObj.getDate() + 30);
            dataInicioFormatada = dataInicioObj.toLocaleDateString('pt-BR');
            dataExpiraFormatada = dataExpiraObj.toLocaleDateString('pt-BR');
        }
        const statusMessage = `
            **ID:** ${cliente.id}<br>
            **Nome:** ${cliente.nome}<br>
            **Telefone:** ${cliente.telefone}<br>
            **Almoços Acumulados:** ${cliente.almoços_acumulados} de 10<br>
            **Início do Ciclo:** ${dataInicioFormatada}<br>
            **Ciclo expira em:** ${dataExpiraFormatada}
        `;
        statusClienteDiv.className = 'feedback info';
        statusClienteDiv.innerHTML = statusMessage;
        btnRegistrar.disabled = false;
        btnResgatar.disabled = cliente.almoços_acumulados < 10;
        btnEditar.disabled = false;
        btnExcluir.disabled = false;
    }

    btnRegistrar.addEventListener('click', async () => {
        if (!clienteAtual) return;
        try {
            const response = await fetch(`/api/clientes/${clienteAtual.id}/registrar`, { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                log(data.mensagem, 'sucesso');
                buscarCliente(clienteAtual.id);
            } else {
                log(`Erro: ${data.error}`, 'erro');
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });

    btnResgatar.addEventListener('click', async () => {
        if (!clienteAtual) return;
        try {
            const response = await fetch(`/api/clientes/${clienteAtual.id}/resgatar`, { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                log(data.mensagem, 'sucesso');
                buscarCliente(clienteAtual.id);
            } else {
                log(`Erro: ${data.error}`, 'erro');
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });
    
    btnEditar.addEventListener('click', () => {
        if (!clienteAtual) return;
        editNomeInput.value = clienteAtual.nome;
        editTelefoneInput.value = clienteAtual.telefone;
        editEmailInput.value = clienteAtual.email || '';
        modalEdicao.style.display = 'block';
    });

    btnExcluir.addEventListener('click', async () => {
        if (!clienteAtual) return;
        const confirmacao = confirm(`Tem certeza que deseja excluir o cliente ${clienteAtual.nome} (ID: ${clienteAtual.id})?`);
        if (confirmacao) {
            try {
                const response = await fetch(`/api/clientes/${clienteAtual.id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) {
                    log(`Cliente **${clienteAtual.nome}** (ID: ${clienteAtual.id}) excluído com sucesso.`, 'sucesso');
                    resetarBusca();
                } else {
                    log(`Erro ao excluir: ${data.error}`, 'erro');
                }
            } catch (error) {
                log('Erro de conexão com o servidor.', 'erro');
            }
        }
    });

    formEdicao.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = editNomeInput.value.trim();
        const telefone = editTelefoneInput.value.trim();
        const email = editEmailInput.value.trim();
        
        if (!nome || !telefone) {
            log('Nome e telefone são obrigatórios para a edição.', 'erro');
            return;
        }

        try {
            const response = await fetch(`/api/clientes/${clienteAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, telefone, email })
            });
            const data = await response.json();
            if (response.ok) {
                log(data.mensagem, 'sucesso');
                modalEdicao.style.display = 'none';
                buscarCliente(clienteAtual.id);
            } else {
                log(`Erro ao editar: ${data.error}`, 'erro');
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });

    btnMostrarTodos.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/clientes');
            const clientes = await response.json();
            if (response.ok) {
                renderizarTabelaClientes(todosClientesLista, clientes, () => modalTodosClientes.style.display = 'none');
                modalTodosClientes.style.display = 'block';
            } else {
                log(`Erro ao buscar todos os clientes: ${clientes.error}`, 'erro');
            }
        } catch (error) {
            log('Erro de conexão com o servidor.', 'erro');
        }
    });
    
    closeButtonBusca.addEventListener('click', () => {
        modalBuscaNome.style.display = 'none';
    });
    closeButtonEdicao.addEventListener('click', () => {
        modalEdicao.style.display = 'none';
    });
    closeButtonTodos.addEventListener('click', () => {
        modalTodosClientes.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == modalBuscaNome) {
            modalBuscaNome.style.display = 'none';
        }
        if (event.target == modalEdicao) {
            modalEdicao.style.display = 'none';
        }
        if (event.target == modalTodosClientes) {
            modalTodosClientes.style.display = 'none';
        }
    });
});